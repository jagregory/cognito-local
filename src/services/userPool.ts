import StormDB from "stormdb";
import fs from "fs";
import { promisify } from "util";

const mkdir = promisify(fs.mkdir);

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
  directory: string = ".cognito/db"
): Promise<UserPool> => {
  await mkdir(directory, { recursive: true });
  const engine = new StormDB.localFileEngine(`${directory}/local.json`, {
    async: true,
    serialize: (obj: unknown) => JSON.stringify(obj, undefined, 2),
  });
  const db = new StormDB(engine);

  db.default({ Users: {}, Options: options });

  const hasAttribute = (
    attributeName: string,
    attributeValue: string,
    user: User
  ) =>
    user.Attributes.filter(
      (x) => x.Name === attributeName && x.Value === attributeValue
    );

  return {
    async getUserByUsername(username) {
      console.log("getUserByUsername", username);

      const options = db.get("Options").value();
      const aliasEmailEnabled = options.UsernameAttributes.includes("email");
      const aliasPhoneNumberEnabled = options.UsernameAttributes.includes(
        "phone_number"
      );

      let users = (await db.get("Users").value()) as { [key: string]: User };

      for (const user of Object.values(users)) {
        if (hasAttribute("sub", username, user)) {
          return user;
        }

        if (aliasEmailEnabled && hasAttribute("email", username, user)) {
          return user;
        }

        if (
          aliasPhoneNumberEnabled &&
          hasAttribute("phone_number", username, user)
        ) {
          return user;
        }
      }

      return null;
    },

    async saveUser(user) {
      console.log("saveUser", user);

      await db.get("Users").set(user.Username, user).save();
    },
  };
};
