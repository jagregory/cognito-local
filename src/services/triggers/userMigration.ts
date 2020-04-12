import * as uuid from "uuid";
import { NotAuthorizedError } from "../../errors";
import { UserPool } from "../index";
import { CognitoUserPoolResponse, Lambda } from "../lambda";
import { attributesToRecord, User, UserAttribute } from "../userPool";

export type UserMigrationTrigger = (params: {
  userPoolId: string;
  clientId: string;
  username: string;
  password: string;
  userAttributes: readonly UserAttribute[];
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
  userAttributes,
}): Promise<User> => {
  let result: CognitoUserPoolResponse;

  try {
    result = await lambda.invoke("UserMigration", {
      userPoolId,
      clientId,
      username,
      password,
      triggerSource: "UserMigration_Authentication",
      userAttributes: attributesToRecord(userAttributes),
    });
  } catch (ex) {
    throw new NotAuthorizedError();
  }

  const user: User = {
    Attributes: userAttributes,
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
