import { AdminDeleteUserRequest } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";
import { NotAuthorizedError } from "../errors";

export type AdminDeleteUserTarget = (
  req: AdminDeleteUserRequest
) => Promise<{}>;

export const AdminDeleteUser = ({
  cognitoClient,
}: Services): AdminDeleteUserTarget => async (req) => {
  const userPool = await cognitoClient.getUserPool(req.UserPoolId);
  const user = await userPool.getUserByUsername(req.Username);
  if (!user) {
    throw new NotAuthorizedError();
  }

  return {};
};
