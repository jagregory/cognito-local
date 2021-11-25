import { AdminDeleteUserRequest } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";
import { UserNotFoundError } from "../errors";

export type AdminDeleteUserTarget = (
  req: AdminDeleteUserRequest
) => Promise<{}>;

type AdminDeleteUserServices = Pick<Services, "cognito">;

export const AdminDeleteUser = ({
  cognito,
}: AdminDeleteUserServices): AdminDeleteUserTarget => async (req) => {
  const userPool = await cognito.getUserPool(req.UserPoolId);
  const user = await userPool.getUserByUsername(req.Username);
  if (!user) {
    throw new UserNotFoundError("User does not exist");
  }

  await userPool.deleteUser(user);

  return {};
};
