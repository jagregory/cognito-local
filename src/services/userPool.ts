import { CreateDataStore } from "./dataStore";

export interface User {
  Username: string;
  UserCreateDate: number;
  UserLastModifiedDate: number;
  Enabled: boolean;
  UserStatus: "CONFIRMED" | "UNCONFIRMED";
  Attributes: readonly {
    Name: "sub" | "email" | "phone_number" | "preferred_username" | string;
    Value: string;
  }[];

  // extra attributes for Cognito Local
  Password: string;
  ConfirmationCode?: string;
}

export interface UserPool {
  getUserByUsername(username: string): Promise<User | null>;
  saveUser(user: User): Promise<void>;
}

type UsernameAttribute = "email" | "phone_number";

interface UserPoolOptions {
  UsernameAttributes: UsernameAttribute[];
}

export const createUserPool = async (
  options: UserPoolOptions = {
    UsernameAttributes: ["email", "phone_number"],
  },
  createDataStore: CreateDataStore
): Promise<UserPool> => {
  const dataStore = await createDataStore("local", {
    Users: {},
    Options: options,
  });

  const attributeEquals = (
    attributeName: string,
    attributeValue: string,
    user: User
  ) =>
    !!user.Attributes.find(
      (x) => x.Name === attributeName && x.Value === attributeValue
    );
  const hasAttribute = (attributeName: string, user: User) =>
    !!user.Attributes.find((x) => x.Name === attributeName);

  return {
    async getUserByUsername(username) {
      console.log("getUserByUsername", username);

      const options = await dataStore.get<UserPoolOptions>("Options");
      const aliasEmailEnabled = options?.UsernameAttributes.includes("email");
      const aliasPhoneNumberEnabled = options?.UsernameAttributes.includes(
        "phone_number"
      );

      const users = await dataStore.get<Record<string, User>>("Users");

      for (const user of Object.values(users ?? {})) {
        if (attributeEquals("sub", username, user)) {
          return user;
        }

        if (aliasEmailEnabled && attributeEquals("email", username, user)) {
          return user;
        }

        if (
          aliasPhoneNumberEnabled &&
          attributeEquals("phone_number", username, user)
        ) {
          return user;
        }
      }

      return null;
    },

    async saveUser(user) {
      console.log("saveUser", user);

      const attributes = hasAttribute("sub", user)
        ? user.Attributes
        : [{ Name: "sub", Value: user.Username }, ...user.Attributes];

      await dataStore.set<User>(`Users.${user.Username}`, {
        ...user,
        Attributes: attributes,
      });
    },
  };
};
