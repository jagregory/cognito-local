import { Services } from "../services";
import { NotAuthorizedError } from "../errors";

interface Input {
  UserPoolId: string;
  Username: string;
}

export type AdminConfirmSignUpTarget = (body: Input) => Promise<object | null>;

export const AdminConfirmSignUp = ({
  cognitoClient,
}: Services): AdminConfirmSignUpTarget => async (body) => {
  const { UserPoolId, Username } = body || {};
  const userPool = await cognitoClient.getUserPool(UserPoolId);
  const user = await userPool.getUserByUsername(Username);
  if (!user) {
    throw new NotAuthorizedError();
  }
  await userPool.saveUser({
    ...user,
    UserStatus: "CONFIRMED",
    // TODO: Remove existing email_verified attribute?
    Attributes: [
      ...(user.Attributes || []),
      {
        Name: "email_verified",
        Value: "true",
      },
    ],
  });
  // TODO: Should possibly return something?
  return {};
};
