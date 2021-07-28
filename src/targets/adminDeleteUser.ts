import { Services } from "../services";
import { NotAuthorizedError } from "../errors";

interface Input {
  UserPoolId: string;
  Username: string;
}

export type AdminDeleteUserTarget = (body: Input) => Promise<null>;

export const AdminDeleteUser = ({
  cognitoClient,
}: Services): AdminDeleteUserTarget => async (body) => {
  const { UserPoolId, Username } = body || {};
  const userPool = await cognitoClient.getUserPool(UserPoolId);
  const user = await userPool.getUserByUsername(Username);
  if (!user) {
    throw new NotAuthorizedError();
  }
  // TODO
  return null;
};
