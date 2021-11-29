import {
  ConfirmForgotPasswordRequest,
  ConfirmForgotPasswordResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { CodeMismatchError, UserNotFoundError } from "../errors";
import { Services } from "../services";

export type ConfirmForgotPasswordTarget = (
  req: ConfirmForgotPasswordRequest
) => Promise<ConfirmForgotPasswordResponse>;

export const ConfirmForgotPassword =
  ({
    cognito,
    clock,
    triggers,
  }: Pick<
    Services,
    "cognito" | "clock" | "triggers"
  >): ConfirmForgotPasswordTarget =>
  async (req) => {
    const userPool = await cognito.getUserPoolForClientId(req.ClientId);
    const user = await userPool.getUserByUsername(req.Username);
    if (!user) {
      throw new UserNotFoundError();
    }

    if (user.ConfirmationCode !== req.ConfirmationCode) {
      throw new CodeMismatchError();
    }

    await userPool.saveUser({
      ...user,
      UserLastModifiedDate: clock.get(),
      UserStatus: "CONFIRMED",
      ConfirmationCode: undefined,
      Password: req.Password,
    });

    if (triggers.enabled("PostConfirmation")) {
      await triggers.postConfirmation({
        clientId: req.ClientId,
        clientMetadata: req.ClientMetadata,
        source: "PostConfirmation_ConfirmForgotPassword",
        userAttributes: user.Attributes,
        username: user.Username,
        userPoolId: userPool.config.Id,
      });
    }

    return {};
  };
