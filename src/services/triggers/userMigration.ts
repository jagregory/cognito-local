import * as uuid from "uuid";
import { NotAuthorizedError } from "../../errors";
import { UserPool } from "../index";
import { CognitoUserPoolResponse, Lambda } from "../lambda";
import { User } from "../userPool";

export type UserMigrationTrigger = (params: {
  userPoolId: string;
  clientId: string;
  username: string;
  password: string;
}) => Promise<User>;

export const UserMigration = ({
  lambda,
  userPool,
}: {
  lambda: Lambda;
  userPool: UserPool;
}): UserMigrationTrigger => async ({
  userPoolId,
  clientId,
  username,
  password,
}): Promise<User> => {
  let result: CognitoUserPoolResponse;

  try {
    result = await lambda.invoke("UserMigration", {
      userPoolId,
      clientId,
      username,
      password,
      triggerSource: "UserMigration_Authentication",
    });
  } catch (ex) {
    throw new NotAuthorizedError();
  }

  const user: User = {
    Attributes: [{ Name: "email", Value: username }],
    Enabled: true,
    Password: password,
    UserCreateDate: new Date().getTime(),
    UserLastModifiedDate: new Date().getTime(),
    Username: uuid.v4(),
    UserStatus: result.finalUserStatus ?? "CONFIRMED",
  };

  if (result.forceAliasCreation) {
    // TODO: do something with aliases?
  }

  await userPool.saveUser(user);

  if (result.messageAction !== "SUPPRESS") {
    // TODO: send notification when not suppressed?
  }

  return user;
};
