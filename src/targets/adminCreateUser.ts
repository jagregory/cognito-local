import {
  AdminCreateUserRequest,
  AdminCreateUserResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import uuid from "uuid";
import { UnsupportedError, UsernameExistsError } from "../errors";
import { Services } from "../services";
import { attributesInclude, User } from "../services/userPoolClient";

export type AdminCreateUserTarget = (
  req: AdminCreateUserRequest
) => Promise<AdminCreateUserResponse>;

export const AdminCreateUser = ({
  clock,
  cognitoClient,
}: Pick<Services, "clock" | "cognitoClient">): AdminCreateUserTarget => async (
  req
) => {
  if (!req.TemporaryPassword) {
    throw new UnsupportedError("AdminCreateUser without TemporaryPassword");
  }

  const userPool = await cognitoClient.getUserPool(req.UserPoolId);
  const existingUser = await userPool.getUserByUsername(req.Username);
  if (existingUser && req.MessageAction === "RESEND") {
    throw new UnsupportedError("AdminCreateUser with MessageAction=RESEND");
  } else if (existingUser) {
    throw new UsernameExistsError();
  }

  const attributes = attributesInclude("sub", req.UserAttributes)
    ? req.UserAttributes ?? []
    : [{ Name: "sub", Value: uuid.v4() }, ...(req.UserAttributes ?? [])];

  const now = clock.get();

  const user: User = {
    Username: req.Username,
    Password: req.TemporaryPassword,
    Attributes: attributes,
    Enabled: true,
    UserStatus: "FORCE_CHANGE_PASSWORD",
    ConfirmationCode: undefined,
    UserCreateDate: now.getTime(),
    UserLastModifiedDate: now.getTime(),
  };
  await userPool.saveUser(user);

  // TODO: should throw InvalidParameterException when a non-email is supplied as the Username when the pool has email as a UsernameAttribute
  // TODO: should send a message unless MessageAction=="SUPPRESS"
  // TODO: support MessageAction=="RESEND"
  // TODO: should generate a TemporaryPassword if one isn't set
  // TODO: support ForceAliasCreation
  // TODO: support PreSignIn lambda and ValidationData

  return {
    User: {
      Username: req.Username,
      Attributes: attributes,
      Enabled: true,
      UserStatus: "FORCE_CHANGE_PASSWORD",
      UserCreateDate: now,
      UserLastModifiedDate: now,
      MFAOptions: undefined,
    },
  };
};
