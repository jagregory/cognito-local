import {
  AttributeListType,
  AttributeType,
  MFAOptionListType,
  SchemaAttributesListType,
  StringType,
  UserMFASettingListType,
  UserPoolType,
  UserStatusType,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { InvalidParameterError } from "../errors";
import { AppClient } from "./appClient";
import { Clock } from "./clock";
import { Context } from "./context";
import { DataStore } from "./dataStore/dataStore";
import { DataStoreFactory } from "./dataStore/factory";

export interface MFAOption {
  DeliveryMedium: "SMS";
  AttributeName: "phone_number";
}

export const attribute = (
  name: string,
  value: string | undefined
): AttributeType => ({ Name: name, Value: value });
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
export const attributesAppend = (
  attributes: AttributeListType | undefined,
  ...toAppend: AttributeListType
): AttributeListType => {
  const attributeSet = attributesToRecord(attributes);

  for (const attr of toAppend) {
    if (attr.Value) {
      attributeSet[attr.Name] = attr.Value;
    } else {
      delete attributeSet[attr.Name];
    }
  }

  return attributesFromRecord(attributeSet);
};

export const attributesRemove = (
  attributes: AttributeListType | undefined,
  ...toRemove: readonly string[]
): AttributeListType =>
  attributes?.filter((x) => !toRemove.includes(x.Name)) ?? [];

export const customAttributes = (
  attributes: AttributeListType | undefined
): AttributeListType =>
  (attributes ?? []).filter((attr) => attr.Name.startsWith("custom:"));

export interface User {
  Attributes: AttributeListType;
  Enabled: boolean;
  MFAOptions?: MFAOptionListType;
  PreferredMfaSetting?: StringType;
  UserCreateDate: Date;
  UserLastModifiedDate: Date;
  UserMFASettingList?: UserMFASettingListType;
  Username: string;
  UserStatus: UserStatusType;

  // extra attributes for Cognito Local
  Password: string;
  AttributeVerificationCode?: string;
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

  /**
   * The group's membership, a list of Usernames
   */
  members?: readonly string[];
}

// just use the types from the sdk, but make Id required
export type UserPool = UserPoolType & {
  Id: string;
};

export interface UserPoolService {
  readonly options: UserPool;

  addUserToGroup(ctx: Context, group: Group, user: User): Promise<void>;
  saveAppClient(ctx: Context, appClient: AppClient): Promise<void>;
  deleteAppClient(ctx: Context, appClient: AppClient): Promise<void>;
  deleteGroup(ctx: Context, group: Group): Promise<void>;
  deleteUser(ctx: Context, user: User): Promise<void>;
  getGroupByGroupName(ctx: Context, groupName: string): Promise<Group | null>;
  getUserByUsername(ctx: Context, username: string): Promise<User | null>;
  getUserByRefreshToken(
    ctx: Context,
    refreshToken: string
  ): Promise<User | null>;
  listGroups(ctx: Context): Promise<readonly Group[]>;
  listUsers(ctx: Context): Promise<readonly User[]>;
  updateOptions(ctx: Context, userPool: UserPool): Promise<void>;
  removeUserFromGroup(ctx: Context, group: Group, user: User): Promise<void>;
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

  private _options: UserPool;

  public get options(): UserPool {
    return this._options;
  }

  public constructor(
    clientsDataStore: DataStore,
    clock: Clock,
    dataStore: DataStore,
    config: UserPool
  ) {
    this.clientsDataStore = clientsDataStore;
    this._options = config;
    this.clock = clock;
    this.dataStore = dataStore;
  }

  public async saveAppClient(
    ctx: Context,
    appClient: AppClient
  ): Promise<void> {
    ctx.logger.debug("UserPoolServiceImpl.saveAppClient");
    await this.clientsDataStore.set(
      ctx,
      ["Clients", appClient.ClientId],
      appClient
    );
  }

  public async deleteAppClient(
    ctx: Context,
    appClient: AppClient
  ): Promise<void> {
    ctx.logger.debug(
      { clientId: appClient.ClientId },
      "UserPoolServiceImpl.deleteAppClient"
    );
    await this.clientsDataStore.delete(ctx, ["Clients", appClient.ClientId]);
  }

  public async deleteGroup(ctx: Context, group: Group): Promise<void> {
    ctx.logger.debug(
      { groupName: group.GroupName },
      "UserPoolServiceImpl.deleteGroup"
    );
    await this.dataStore.delete(ctx, ["Groups", group.GroupName]);
  }

  public async deleteUser(ctx: Context, user: User): Promise<void> {
    ctx.logger.debug(
      { username: user.Username },
      "UserPoolServiceImpl.deleteUser"
    );

    await this.dataStore.delete(ctx, ["Users", user.Username]);
    await this.removeUserFromAllGroups(ctx, user);
  }

  public async getGroupByGroupName(
    ctx: Context,
    groupName: string
  ): Promise<Group | null> {
    ctx.logger.debug("UserPoolServiceImpl.getGroupByGroupName");
    const result = await this.dataStore.get<Group>(ctx, ["Groups", groupName]);

    return result ?? null;
  }

  public async getUserByUsername(
    ctx: Context,
    username: string
  ): Promise<User | null> {
    ctx.logger.debug({ username }, "UserPoolServiceImpl.getUserByUsername");

    const aliasEmailEnabled =
      this.options.UsernameAttributes?.includes("email");
    const aliasPhoneNumberEnabled =
      this.options.UsernameAttributes?.includes("phone_number");

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

  public async updateOptions(ctx: Context, userPool: UserPool): Promise<void> {
    ctx.logger.debug(
      { userPoolId: userPool.Id },
      "UserPoolServiceImpl.updateOptions"
    );
    await this.dataStore.set(ctx, "Options", userPool);
    this._options = userPool;
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

  public async addUserToGroup(
    ctx: Context,
    group: Group,
    user: User
  ): Promise<void> {
    ctx.logger.debug(
      { username: user.Username, groupName: group.GroupName },
      "UserPoolServiceImpl.addUserToFromGroup"
    );

    const groupMembers = new Set(group.members ?? []);
    if (!groupMembers.has(user.Username)) {
      groupMembers.add(user.Username);
      await this.saveGroup(ctx, {
        ...group,
        LastModifiedDate: this.clock.get(),
        members: Array.from(groupMembers),
      });
    }
  }

  public async removeUserFromGroup(
    ctx: Context,
    group: Group,
    user: User
  ): Promise<void> {
    ctx.logger.debug(
      { username: user.Username, groupName: group.GroupName },
      "UserPoolServiceImpl.removeUserFromGroup"
    );

    const groupMembers = new Set(group.members ?? []);
    if (groupMembers.has(user.Username)) {
      groupMembers.delete(user.Username);
      await this.saveGroup(ctx, {
        ...group,
        LastModifiedDate: this.clock.get(),
        members: Array.from(groupMembers),
      });
    }
  }

  private async removeUserFromAllGroups(
    ctx: Context,
    user: User
  ): Promise<void> {
    ctx.logger.debug(
      { username: user.Username },
      "UserPoolServiceImpl.removeUserFromAllGroups"
    );
    const groups = await this.listGroups(ctx);

    await Promise.all(
      groups.map((group) => this.removeUserFromGroup(ctx, group, user))
    );
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

export const validatePermittedAttributeChanges = (
  requestAttributes: AttributeListType,
  schemaAttributes: SchemaAttributesListType
): AttributeListType => {
  for (const attr of requestAttributes) {
    const attrSchema = schemaAttributes.find((x) => x.Name === attr.Name);
    if (!attrSchema) {
      throw new InvalidParameterError(
        `user.${attr.Name}: Attribute does not exist in the schema.`
      );
    }
    if (!attrSchema.Mutable) {
      throw new InvalidParameterError(
        `user.${attr.Name}: Attribute cannot be updated. (changing an immutable attribute)`
      );
    }
  }

  if (
    attributesInclude("email_verified", requestAttributes) &&
    !attributesInclude("email", requestAttributes)
  ) {
    throw new InvalidParameterError(
      "Email is required to verify/un-verify an email"
    );
  }

  if (
    attributesInclude("phone_number_verified", requestAttributes) &&
    !attributesInclude("phone_number", requestAttributes)
  ) {
    throw new InvalidParameterError(
      "Phone Number is required to verify/un-verify a phone number"
    );
  }

  return requestAttributes;
};

export const defaultVerifiedAttributesIfModified = (
  attributes: AttributeListType
): AttributeListType => {
  const attributesToSet = [...attributes];
  if (
    attributesInclude("email", attributes) &&
    !attributesInclude("email_verified", attributes)
  ) {
    attributesToSet.push(attribute("email_verified", "false"));
  }
  if (
    attributesInclude("phone_number", attributes) &&
    !attributesInclude("phone_number_verified", attributes)
  ) {
    attributesToSet.push(attribute("phone_number_verified", "false"));
  }
  return attributesToSet;
};

export const hasUnverifiedContactAttributes = (
  userAttributesToSet: AttributeListType
): boolean =>
  attributeValue("email_verified", userAttributesToSet) === "false" ||
  attributeValue("phone_number_verified", userAttributesToSet) === "false";
