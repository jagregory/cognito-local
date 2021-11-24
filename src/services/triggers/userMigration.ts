import { AttributeListType } from "aws-sdk/clients/cognitoidentityserviceprovider";
import * as uuid from "uuid";
import { NotAuthorizedError, ResourceNotFoundError } from "../../errors";
import { Clock } from "../clock";
import { CognitoClient } from "../cognitoClient";
import { CognitoUserPoolResponse, Lambda } from "../lambda";
import {
  attributesFromRecord,
  attributesToRecord,
  User,
} from "../userPoolClient";

export type UserMigrationTrigger = (params: {
  userPoolId: string;
  clientId: string;
  username: string;
  password: string;
  userAttributes: AttributeListType;
}) => Promise<User>;

export const UserMigration = ({
  lambda,
  cognitoClient,
  clock,
}: {
  lambda: Lambda;
  cognitoClient: CognitoClient;
  clock: Clock;
}): UserMigrationTrigger => async ({
  userPoolId,
  clientId,
  username,
  password,
  userAttributes,
}): Promise<User> => {
  const userPool = await cognitoClient.getUserPoolForClientId(clientId);
  if (!userPool) {
    throw new ResourceNotFoundError();
  }

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

  const now = Math.floor(clock.get().getTime() / 1000);
  const user: User = {
    Attributes: attributesFromRecord(result.userAttributes ?? {}),
    Enabled: true,
    Password: password,
    UserCreateDate: now,
    UserLastModifiedDate: now,
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
