import {
  ConfirmSignUpRequest,
  ConfirmSignUpResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { CodeMismatchError, NotAuthorizedError } from "../errors";
import { Services } from "../services";

export type ConfirmSignUpTarget = (
  req: ConfirmSignUpRequest
) => Promise<ConfirmSignUpResponse>;

export const ConfirmSignUp = ({
  cognito,
  clock,
  triggers,
}: Pick<
  Services,
  "cognito" | "clock" | "triggers"
>): ConfirmSignUpTarget => async (req) => {
  const userPool = await cognito.getUserPoolForClientId(req.ClientId);
  const user = await userPool.getUserByUsername(req.Username);
  if (!user) {
    throw new NotAuthorizedError();
  }

  if (user.ConfirmationCode !== req.ConfirmationCode) {
    throw new CodeMismatchError();
  }

  await userPool.saveUser({
    ...user,
    UserStatus: "CONFIRMED",
    ConfirmationCode: undefined,
    UserLastModifiedDate: clock.get(),
  });

  if (triggers.enabled("PostConfirmation")) {
    await triggers.postConfirmation({
      source: "PostConfirmation_ConfirmSignUp",
      username: user.Username,
      clientId: req.ClientId,
      userPoolId: userPool.config.Id,
      userAttributes: user.Attributes,
    });
  }

  return {};
};
