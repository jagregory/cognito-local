import {
  AttributeListType,
  MFAOptionListType,
  UserPoolType,
  UserStatusType,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { AppClient, newId } from "./appClient";
import { Clock } from "./clock";
import { Context } from "./context";
import { DataStore } from "./dataStore/dataStore";
import { DataStoreFactory } from "./dataStore/factory";

export interface MFAOption {
  DeliveryMedium: "SMS";
  AttributeName: "phone_number";
}

export const attributesIncludeMatch = (
  attributeName: string,
  attributeValue: string,
  attributes: AttributeListType | undefined
) =>
  !!(attributes ?? []).find(
    (x) => x.Name === attributeName && x.Value === attributeValue
  );
export const attributesInclude = (
  attributeName: string,
  attributes: AttributeListType | undefined
) => !!(attributes ?? []).find((x) => x.Name === attributeName);
export const attributeValue = (
  attributeName: string | undefined,
  attributes: AttributeListType | undefined
) => (attributes ?? []).find((x) => x.Name === attributeName)?.Value;
export const attributesToRecord = (
  attributes: AttributeListType | undefined
): Record<string, string> =>
  (attributes ?? []).reduce(
    (acc, attr) => ({ ...acc, [attr.Name]: attr.Value }),
    {}
  );
export const attributesFromRecord = (
  attributes: Record<string, string>
): AttributeListType =>
  Object.entries(attributes).map(([Name, Value]) => ({ Name, Value }));

export const customAttributes = (
  attributes: AttributeListType | undefined
): AttributeListType =>
  (attributes ?? []).filter((attr) => attr.Name.startsWith("custom:"));

export interface User {
  Username: string;
  UserCreateDate: Date;
  UserLastModifiedDate: Date;
  Enabled: boolean;
  UserStatus: UserStatusType;
  Attributes: AttributeListType;
  MFAOptions?: MFAOptionListType;

  // extra attributes for Cognito Local
  Password: string;
  ConfirmationCode?: string;
  MFACode?: string;
  RefreshTokens: string[];
}

export interface Group {
  /**
   * The name of the group.
   */
  GroupName: string;
  /**
   * A string containing the description of the group.
   */
  Description?: string;
  /**
   * The role ARN for the group.
   */
  RoleArn?: string;
  /**
   * A nonnegative integer value that specifies the precedence of this group relative to the other groups that a user can belong to in the user pool. If a user belongs to two or more groups, it is the group with the highest precedence whose role ARN will be used in the cognito:roles and cognito:preferred_role claims in the user's tokens. Groups with higher Precedence values take precedence over groups with lower Precedence values or with null Precedence values. Two groups can have the same Precedence value. If this happens, neither group takes precedence over the other. If two groups with the same Precedence have the same role ARN, that role is used in the cognito:preferred_role claim in tokens for users in each group. If the two groups have different role ARNs, the cognito:preferred_role claim is not set in users' tokens. The default Precedence value is null.
   */
  Precedence?: number;
  /**
   * The date the group was last modified.
   */
  LastModifiedDate: Date;
  /**
   * The date the group was created.
   */
  CreationDate: Date;
}

// just use the types from the sdk, but make Id required
export type UserPool = UserPoolType & {
  Id: string;
};

export interface UserPoolService {
  readonly config: UserPool;

  createAppClient(ctx: Context, name: string): Promise<AppClient>;
  deleteUser(ctx: Context, user: User): Promise<void>;
  getUserByUsername(ctx: Context, username: string): Promise<User | null>;
  getUserByRefreshToken(
    ctx: Context,
    refreshToken: string
  ): Promise<User | null>;
  listGroups(ctx: Context): Promise<readonly Group[]>;
  listUsers(ctx: Context): Promise<readonly User[]>;
  saveGroup(ctx: Context, group: Group): Promise<void>;
  saveUser(ctx: Context, user: User): Promise<void>;
  storeRefreshToken(
    ctx: Context,
    refreshToken: string,
    user: User
  ): Promise<void>;
}

export interface UserPoolServiceFactory {
  create(
    ctx: Context,
    clientsDataStore: DataStore,
    defaultOptions: UserPool
  ): Promise<UserPoolService>;
}

export class UserPoolServiceImpl implements UserPoolService {
  private readonly clientsDataStore: DataStore;
  private readonly clock: Clock;
  private readonly dataStore: DataStore;

  public readonly config: UserPool;

  public constructor(
    clientsDataStore: DataStore,
    clock: Clock,
    dataStore: DataStore,
    config: UserPool
  ) {
    this.clientsDataStore = clientsDataStore;
    this.config = config;
    this.clock = clock;
    this.dataStore = dataStore;
  }

  public async createAppClient(ctx: Context, name: string): Promise<AppClient> {
    ctx.logger.debug({ name }, "UserPoolServiceImpl.createAppClient");
    const id = newId();
    const now = this.clock.get();

    const appClient: AppClient = {
      ClientId: id,
      ClientName: name,
      UserPoolId: this.config.Id,
      CreationDate: now,
      LastModifiedDate: now,
      AllowedOAuthFlowsUserPoolClient: false,
      RefreshTokenValidity: 30,
    };

    await this.clientsDataStore.set(ctx, ["Clients", id], appClient);

    return appClient;
  }

  public async deleteUser(ctx: Context, user: User): Promise<void> {
    ctx.logger.debug(
      { username: user.Username },
      "UserPoolServiceImpl.deleteUser"
    );
    await this.dataStore.delete(ctx, ["Users", user.Username]);
  }

  public async getUserByUsername(
    ctx: Context,
    username: string
  ): Promise<User | null> {
    ctx.logger.debug({ username }, "UserPoolServiceImpl.getUserByUsername");

    const aliasEmailEnabled = this.config.UsernameAttributes?.includes("email");
    const aliasPhoneNumberEnabled =
      this.config.UsernameAttributes?.includes("phone_number");

    const userByUsername = await this.dataStore.get<User>(ctx, [
      "Users",
      username,
    ]);
    if (userByUsername) {
      return userByUsername;
    }

    const users = await this.dataStore.get<Record<string, User>>(
      ctx,
      "Users",
      {}
    );

    for (const user of Object.values(users)) {
      if (attributesIncludeMatch("sub", username, user.Attributes)) {
        return user;
      }

      if (
        aliasEmailEnabled &&
        attributesIncludeMatch("email", username, user.Attributes)
      ) {
        return user;
      }

      if (
        aliasPhoneNumberEnabled &&
        attributesIncludeMatch("phone_number", username, user.Attributes)
      ) {
        return user;
      }
    }

    return null;
  }

  public async getUserByRefreshToken(
    ctx: Context,
    refreshToken: string
  ): Promise<User | null> {
    ctx.logger.debug(
      { refreshToken },
      "UserPoolServiceImpl.getUserByRefreshToken"
    );
    const users = await this.listUsers(ctx);
    const user = users.find(
      (user) =>
        Array.isArray(user.RefreshTokens) &&
        user.RefreshTokens.includes(refreshToken)
    );

    return user ?? null;
  }

  public async listUsers(ctx: Context): Promise<readonly User[]> {
    ctx.logger.debug("UserPoolServiceImpl.listUsers");
    const users = await this.dataStore.get<Record<string, User>>(
      ctx,
      "Users",
      {}
    );

    return Object.values(users);
  }

  public async saveUser(ctx: Context, user: User): Promise<void> {
    ctx.logger.debug({ user }, "UserPoolServiceImpl.saveUser");

    await this.dataStore.set<User>(ctx, ["Users", user.Username], user);
  }

  async listGroups(ctx: Context): Promise<readonly Group[]> {
    ctx.logger.debug("UserPoolServiceImpl.listGroups");
    const groups = await this.dataStore.get<Record<string, Group>>(
      ctx,
      "Groups",
      {}
    );

    return Object.values(groups);
  }

  async saveGroup(ctx: Context, group: Group): Promise<void> {
    ctx.logger.debug({ group }, "UserPoolServiceImpl.saveGroup");

    await this.dataStore.set<Group>(ctx, ["Groups", group.GroupName], group);
  }

  async storeRefreshToken(
    ctx: Context,
    refreshToken: string,
    user: User
  ): Promise<void> {
    ctx.logger.debug(
      { refreshToken, username: user.Username },
      "UserPoolServiceImpl.storeRefreshToken",
      refreshToken
    );
    const refreshTokens = Array.isArray(user.RefreshTokens)
      ? user.RefreshTokens
      : [];
    refreshTokens.push(refreshToken);

    await this.saveUser(ctx, {
      ...user,
      RefreshTokens: refreshTokens,
    });
  }
}

export class UserPoolServiceFactoryImpl implements UserPoolServiceFactory {
  private readonly clock: Clock;
  private readonly dataStoreFactory: DataStoreFactory;

  public constructor(clock: Clock, dataStoreFactory: DataStoreFactory) {
    this.clock = clock;
    this.dataStoreFactory = dataStoreFactory;
  }

  public async create(
    ctx: Context,
    clientsDataStore: DataStore,
    defaultOptions: UserPool
  ): Promise<UserPoolService> {
    const id = defaultOptions.Id;

    ctx.logger.debug({ id }, "UserPoolServiceImpl.create");

    const dataStore = await this.dataStoreFactory.create(ctx, id, {
      Users: {},
      Options: defaultOptions,
    });
    const config = await dataStore.get<UserPool>(
      ctx,
      "Options",
      defaultOptions
    );

    return new UserPoolServiceImpl(
      clientsDataStore,
      this.clock,
      dataStore,
      config
    );
  }
}
