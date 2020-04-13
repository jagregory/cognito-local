import { CreateDataStore } from "./dataStore";

export interface UserAttribute {
  Name: "sub" | "email" | "phone_number" | "preferred_username" | string;
  Value: string;
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

  // extra attributes for Cognito Local
  Password: string;
  ConfirmationCode?: string;
}

export interface UserPool {
  getUserByUsername(username: string): Promise<User | null>;
  getUserPoolIdForClientId(clientId: string): Promise<string | null>;
  listUsers(): Promise<readonly User[]>;
  saveUser(user: User): Promise<void>;
}

type UsernameAttribute = "email" | "phone_number";

export interface UserPoolOptions {
  UserPoolId?: string;
  UsernameAttributes?: UsernameAttribute[];
}

export const createUserPool = async (
  options: UserPoolOptions,
  createDataStore: CreateDataStore
): Promise<UserPool> => {
  const dataStore = await createDataStore(options.UserPoolId ?? "local", {
    Users: {},
    Options: options,
  });

  return {
    async getUserPoolIdForClientId() {
      // TODO: support user pool to client mapping
      const options = await dataStore.get<UserPoolOptions>("Options");

      return Promise.resolve(options?.UserPoolId ?? "local");
    },

    async getUserByUsername(username) {
      console.log("getUserByUsername", username);

      const options = await dataStore.get<UserPoolOptions>("Options");
      const aliasEmailEnabled = options?.UsernameAttributes?.includes("email");
      const aliasPhoneNumberEnabled = options?.UsernameAttributes?.includes(
        "phone_number"
      );

      const users = await dataStore.get<Record<string, User>>("Users");

      for (const user of Object.values(users ?? {})) {
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
      const users = (await dataStore.get<Record<string, User>>("Users")) ?? {};

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
