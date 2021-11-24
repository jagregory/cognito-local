import {
  AdminCreateUserRequest,
  AdminCreateUserResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import uuid from "uuid";
import { UnsupportedError } from "../errors";
import { Services } from "../services";
import { attributesInclude, User } from "../services/userPoolClient";

export type AdminCreateUserTarget = (
  req: AdminCreateUserRequest
) => Promise<AdminCreateUserResponse>;

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

  const now = clock.get();

  const user: User = {
    Username: req.Username,
    Password: req.TemporaryPassword,
    Attributes: attributes,
    Enabled: true,
    UserStatus: "CONFIRMED",
    ConfirmationCode: undefined,
    UserCreateDate: now.getTime(),
    UserLastModifiedDate: now.getTime(),
  };
  await userPool.saveUser(user);

  return {
    User: {
      Username: req.Username,
      Attributes: attributes,
      Enabled: true,
      UserStatus: "CONFIRMED",
      UserCreateDate: now,
      UserLastModifiedDate: now,
      MFAOptions: undefined,
    },
  };
};
