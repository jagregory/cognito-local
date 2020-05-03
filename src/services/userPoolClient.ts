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
  !!attributes.find(
    (x) => x.Name === attributeName && x.Value === attributeValue
  );
export const attributesInclude = (
  attributeName: string,
  attributes: readonly UserAttribute[]
) => !!attributes.find((x) => x.Name === attributeName);
export const attributeValue = (
  attributeName: string,
  attributes: readonly UserAttribute[]
) => attributes.find((x) => x.Name === attributeName)?.Value;
export const attributesToRecord = (
  attributes: readonly UserAttribute[]
): Record<string, string> =>
  attributes.reduce((acc, attr) => ({ ...acc, [attr.Name]: attr.Value }), {});
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
  createDataStore: CreateDataStore
) => Promise<UserPoolClient>;

export const createUserPoolClient = async (
  defaultOptions: UserPool,
  clientsDataStore: DataStore,
  createDataStore: CreateDataStore
): Promise<UserPoolClient> => {
  const dataStore = await createDataStore(defaultOptions.Id, {
    Users: {},
    Options: defaultOptions,
  });
  const config = await dataStore.get<UserPool>("Options", defaultOptions);

  return {
    config,
    async createAppClient(name) {
      const id = newId();
      const appClient: AppClient = {
        ClientId: id,
        ClientName: name,
        UserPoolId: defaultOptions.Id,
        CreationDate: new Date().getTime(),
        LastModifiedDate: new Date().getTime(),
        AllowedOAuthFlowsUserPoolClient: false,
        RefreshTokenValidity: 30,
      };

      await clientsDataStore.set(["Clients", id], appClient);

      return appClient;
    },

    async getUserByUsername(username) {
      console.log("getUserByUsername", username);

      const aliasEmailEnabled = config.UsernameAttributes?.includes("email");
      const aliasPhoneNumberEnabled = config.UsernameAttributes?.includes(
        "phone_number"
      );

      const users = await dataStore.get<Record<string, User>>("Users", {});

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
    },

    async listUsers(): Promise<readonly User[]> {
      console.log("listUsers");
      const users = await dataStore.get<Record<string, User>>("Users", {});

      return Object.values(users);
    },

    async saveUser(user) {
      console.log("saveUser", user);

      const attributes = attributesInclude("sub", user.Attributes)
        ? user.Attributes
        : [{ Name: "sub", Value: user.Username }, ...user.Attributes];

      await dataStore.set<User>(`Users.${user.Username}`, {
        ...user,
        Attributes: attributes,
      });
    },
  };
};
