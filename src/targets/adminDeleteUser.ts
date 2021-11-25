import { AdminDeleteUserRequest } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";
import { UserNotFoundError } from "../errors";

export type AdminDeleteUserTarget = (
  req: AdminDeleteUserRequest
) => Promise<{}>;

type AdminDeleteUserServices = Pick<Services, "cognitoClient">;

export const AdminDeleteUser = ({
  cognitoClient,
}: AdminDeleteUserServices): AdminDeleteUserTarget => async (req) => {
  const userPool = await cognitoClient.getUserPool(req.UserPoolId);
  const user = await userPool.getUserByUsername(req.Username);
  if (!user) {
    throw new UserNotFoundError("User does not exist");
  }

  await userPool.deleteUser(user);

  return {};
};
