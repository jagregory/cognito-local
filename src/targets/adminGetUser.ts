import {
  AdminGetUserRequest,
  AdminGetUserResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";
import { NotAuthorizedError } from "../errors";

export type AdminGetUserTarget = (
  req: AdminGetUserRequest
) => Promise<AdminGetUserResponse>;

export const AdminGetUser = ({
  cognitoClient,
}: Services): AdminGetUserTarget => async (req) => {
  const userPool = await cognitoClient.getUserPool(req.UserPoolId);
  const user = await userPool.getUserByUsername(req.Username);
  if (!user) {
    throw new NotAuthorizedError();
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
