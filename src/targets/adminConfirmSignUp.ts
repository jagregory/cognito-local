import {
  AdminConfirmSignUpRequest,
  AdminConfirmSignUpResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";
import { NotAuthorizedError } from "../errors";

export type AdminConfirmSignUpTarget = (
  req: AdminConfirmSignUpRequest
) => Promise<AdminConfirmSignUpResponse>;

export const AdminConfirmSignUp = ({
  cognito,
}: Services): AdminConfirmSignUpTarget => async (req) => {
  const userPool = await cognito.getUserPool(req.UserPoolId);
  const user = await userPool.getUserByUsername(req.Username);
  if (!user) {
    throw new NotAuthorizedError();
  }

  // TODO: call PostConfirmation lambda

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

  return {};
};
