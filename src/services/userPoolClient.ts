import { Logger } from "../log";
import { AppClient, newId } from "./appClient";
import { CreateDataStore, DataStore } from "./dataStore";

export interface UserAttribute {
  Name: "sub" | "email" | "phone_number" | "preferred_username" | string;
  Value: string;
}

export interface MFAOption {
  DeliveryMedium: "SMS";
  AttributeName: "phone_number";
}

export const attributesIncludeMatch = (
  attributeName: string,
  attributeValue: string,
  attributes: readonly UserAttribute[]
) =>
  !!(attributes || []).find(
    (x) => x.Name === attributeName && x.Value === attributeValue
  );
export const attributesInclude = (
  attributeName: string,
  attributes: readonly UserAttribute[]
) => !!(attributes || []).find((x) => x.Name === attributeName);
export const attributeValue = (
  attributeName: string,
  attributes: readonly UserAttribute[]
) => (attributes || []).find((x) => x.Name === attributeName)?.Value;
export const attributesToRecord = (
  attributes: readonly UserAttribute[]
): Record<string, string> =>
  (attributes || []).reduce(
    (acc, attr) => ({ ...acc, [attr.Name]: attr.Value }),
    {}
  );
export const attributesFromRecord = (
  attributes: Record<string, string>
): readonly UserAttribute[] =>
  Object.entries(attributes).map(([Name, Value]) => ({ Name, Value }));

export interface User {
  Username: string;
  UserCreateDate: number;
  UserLastModifiedDate: number;
  Enabled: boolean;
  UserStatus: "CONFIRMED" | "UNCONFIRMED" | "RESET_REQUIRED";
  Attributes: readonly UserAttribute[];
  MFAOptions?: readonly MFAOption[];

  // extra attributes for Cognito Local
  Password: string;
  ConfirmationCode?: string;
  MFACode?: string;
}

type UsernameAttribute = "email" | "phone_number";

export interface UserPool {
  Id: string;
  UsernameAttributes?: UsernameAttribute[];
  MfaConfiguration?: "OFF" | "ON" | "OPTIONAL";
}

export interface UserPoolClient {
  readonly config: UserPool;

  createAppClient(name: string): Promise<AppClient>;
  getUserByUsername(username: string): Promise<User | null>;
  listUsers(): Promise<readonly User[]>;
  saveUser(user: User): Promise<void>;
}

export type CreateUserPoolClient = (
  defaultOptions: UserPool,
  clientsDataStore: DataStore,
  createDataStore: CreateDataStore,
  logger: Logger
) => Promise<UserPoolClient>;

export class UserPoolClientService implements UserPoolClient {
  private readonly clientsDataStore: DataStore;
  private readonly dataStore: DataStore;
  private readonly logger: Logger;

  public readonly config: UserPool;

  public static async create(
    defaultOptions: UserPool,
    clientsDataStore: DataStore,
    createDataStore: CreateDataStore,
    logger: Logger
  ): Promise<UserPoolClient> {
    const dataStore = await createDataStore(defaultOptions.Id, {
      Users: {},
      Options: defaultOptions,
    });
    const config = await dataStore.get<UserPool>("Options", defaultOptions);

    return new UserPoolClientService(
      clientsDataStore,
      dataStore,
      config,
      logger
    );
  }

  public constructor(
    clientsDataStore: DataStore,
    dataStore: DataStore,
    config: UserPool,
    logger: Logger
  ) {
    this.clientsDataStore = clientsDataStore;
    this.config = config;
    this.dataStore = dataStore;
    this.logger = logger;
  }

  public async createAppClient(name: string): Promise<AppClient> {
    const id = newId();
    const appClient: AppClient = {
      ClientId: id,
      ClientName: name,
      UserPoolId: this.config.Id,
      CreationDate: new Date().getTime(),
      LastModifiedDate: new Date().getTime(),
      AllowedOAuthFlowsUserPoolClient: false,
      RefreshTokenValidity: 30,
    };

    await this.clientsDataStore.set(["Clients", id], appClient);

    return appClient;
  }

  public async getUserByUsername(username: string): Promise<User | null> {
    this.logger.debug("getUserByUsername", username);

    const aliasEmailEnabled = this.config.UsernameAttributes?.includes("email");
    const aliasPhoneNumberEnabled = this.config.UsernameAttributes?.includes(
      "phone_number"
    );

    const userByUsername = await this.dataStore.get<User>(["Users", username]);
    if (userByUsername) {
      return userByUsername;
    }

    const users = await this.dataStore.get<Record<string, User>>("Users", {});

    for (const user of Object.values(users)) {
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
}
