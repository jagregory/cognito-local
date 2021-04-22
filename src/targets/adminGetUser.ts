import { Services } from "../services";
import { NotAuthorizedError } from "../errors";

interface Input {
  UserPoolId: string;
  Username: string;
}

interface Output {
  UserAttributes: any;
}

export type AdminGetUserTarget = (body: Input) => Promise<Output | null>;

export const AdminGetUser = ({
  cognitoClient,
}: Services): AdminGetUserTarget => async (body) => {
  const { UserPoolId, Username } = body || {};
  const userPool = await cognitoClient.getUserPool(UserPoolId);
  const user = await userPool.getUserByUsername(Username);
  if (!user) {
    throw new NotAuthorizedError();
  }
  return {
    UserAttributes: user.Attributes,
  };
};
