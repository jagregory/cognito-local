import { AdminCreateUserRequest } from "aws-sdk/clients/cognitoidentityserviceprovider";
import uuid from "uuid";
import { UnsupportedError } from "../errors";
import { Services } from "../services";
import { attributesInclude, User } from "../services/userPoolClient";

export type AdminCreateUserTarget = (
  body: AdminCreateUserRequest
) => Promise<{ User: User }>;

export const AdminCreateUser = ({
  cognitoClient,
  clock,
}: Services): AdminCreateUserTarget => async (req) => {
  if (!req.TemporaryPassword) {
    throw new UnsupportedError("AdminCreateUser without TemporaryPassword");
  }

  const userPool = await cognitoClient.getUserPool(req.UserPoolId);

  const attributes = attributesInclude("sub", req.UserAttributes)
    ? req.UserAttributes ?? []
    : [{ Name: "sub", Value: uuid.v4() }, ...(req.UserAttributes ?? [])];

  const now = Math.floor(clock.get().getTime() / 1000);
  const user: User = {
    Username: req.Username,
    Password: req.TemporaryPassword,
    Attributes: attributes,
    Enabled: true,
    UserStatus: "CONFIRMED",
    ConfirmationCode: undefined,
    UserCreateDate: now,
    UserLastModifiedDate: now,
  };

  await userPool.saveUser(user);

  // TODO: Shouldn't return password.
  return { User: user };
};
