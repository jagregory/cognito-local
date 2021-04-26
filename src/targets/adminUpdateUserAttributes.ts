import { Services } from "../services";
import { NotAuthorizedError } from "../errors";

interface Input {
  UserPoolId: string;
  Username: string;
  UserAttributes: any;
}

interface Output {
  UserAttributes: any;
}

export type AdminUpdateUserAttributesTarget = (
  body: Input
) => Promise<Output | null>;

export const AdminUpdateUserAttributes = ({
  cognitoClient,
}: Services): AdminUpdateUserAttributesTarget => async (body) => {
  const { UserPoolId, Username } = body || {};
  const userPool = await cognitoClient.getUserPool(UserPoolId);
  const user = await userPool.getUserByUsername(Username);
  if (!user) {
    throw new NotAuthorizedError();
  }
  // TODO: Should save the attributes.
  return {
    UserAttributes: user.Attributes,
  };
};
