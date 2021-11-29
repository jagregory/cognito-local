import {
  AttributeListType,
  MFAOptionListType,
  UserPoolType,
  UserStatusType,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Logger } from "../log";
import { AppClient, newId } from "./appClient";
import { Clock } from "./clock";
import { CreateDataStore, DataStore } from "./dataStore";

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

  createAppClient(name: string): Promise<AppClient>;
  deleteUser(user: User): Promise<void>;
  getUserByUsername(username: string): Promise<User | null>;
  listGroups(): Promise<readonly Group[]>;
  listUsers(): Promise<readonly User[]>;
  saveGroup(group: Group): Promise<void>;
  saveUser(user: User): Promise<void>;
}

export type CreateUserPoolService = (
  dataDirectory: string,
  clientsDataStore: DataStore,
  clock: Clock,
  createDataStore: CreateDataStore,
  defaultOptions: UserPool,
  logger: Logger
) => Promise<UserPoolService>;

export class UserPoolServiceImpl implements UserPoolService {
  private readonly clientsDataStore: DataStore;
  private readonly clock: Clock;
  private readonly dataStore: DataStore;
  private readonly logger: Logger;

  public readonly config: UserPool;

  public static async create(
    dataDirectory: string,
    clientsDataStore: DataStore,
    clock: Clock,
    createDataStore: CreateDataStore,
    defaultOptions: UserPool,
    logger: Logger
  ): Promise<UserPoolService> {
    const dataStore = await createDataStore(
      defaultOptions.Id,
      {
        Users: {},
        Options: defaultOptions,
      },
      dataDirectory
    );
    const config = await dataStore.get<UserPool>("Options", defaultOptions);

    return new UserPoolServiceImpl(
      clientsDataStore,
      clock,
      dataStore,
      config,
      logger
    );
  }

  public constructor(
    clientsDataStore: DataStore,
    clock: Clock,
    dataStore: DataStore,
    config: UserPool,
    logger: Logger
  ) {
    this.clientsDataStore = clientsDataStore;
    this.config = config;
    this.clock = clock;
    this.dataStore = dataStore;
    this.logger = logger;
  }

  public async createAppClient(name: string): Promise<AppClient> {
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

    await this.clientsDataStore.set(["Clients", id], appClient);

    return appClient;
  }

  public async deleteUser(user: User): Promise<void> {
    await this.dataStore.delete(["Users", user.Username]);
  }

  public async getUserByUsername(username: string): Promise<User | null> {
    this.logger.debug("getUserByUsername", username);

    const aliasEmailEnabled = this.config.UsernameAttributes?.includes("email");
    const aliasPhoneNumberEnabled =
      this.config.UsernameAttributes?.includes("phone_number");

    const userByUsername = await this.dataStore.get<User>(["Users", username]);
    if (userByUsername) {
      return userByUsername;
    }

    const users = await this.dataStore.get<Record<string, User>>("Users", {});

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

  public async listUsers(): Promise<readonly User[]> {
    this.logger.debug("listUsers");
    const users = await this.dataStore.get<Record<string, User>>("Users", {});

    return Object.values(users);
  }

  public async saveUser(user: User): Promise<void> {
    this.logger.debug("saveUser", user);

    await this.dataStore.set<User>(["Users", user.Username], user);
  }

  async listGroups(): Promise<readonly Group[]> {
    this.logger.debug("listGroups");
    const groups = await this.dataStore.get<Record<string, Group>>(
      "Groups",
      {}
    );

    return Object.values(groups);
  }

  async saveGroup(group: Group) {
    this.logger.debug("saveGroup", group);

    await this.dataStore.set<Group>(["Groups", group.GroupName], group);
  }
}
