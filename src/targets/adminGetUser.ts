import {
  AdminGetUserRequest,
  AdminGetUserResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";
import { UserNotFoundError } from "../errors";

export type AdminGetUserTarget = (
  req: AdminGetUserRequest
) => Promise<AdminGetUserResponse>;

type AdminGetUserServices = Pick<Services, "cognito">;

export const AdminGetUser = ({
  cognito,
}: AdminGetUserServices): AdminGetUserTarget => async (req) => {
  const userPool = await cognito.getUserPool(req.UserPoolId);
  const user = await userPool.getUserByUsername(req.Username);
  if (!user) {
    throw new UserNotFoundError("User does not exist");
  }

  return {
    Enabled: user.Enabled,
    MFAOptions: user.MFAOptions,
    PreferredMfaSetting: undefined,
    UserAttributes: user.Attributes,
    UserCreateDate: new Date(user.UserCreateDate),
    UserLastModifiedDate: new Date(user.UserLastModifiedDate),
    UserMFASettingList: undefined,
    Username: user.Username,
    UserStatus: user.UserStatus,
  };
};
