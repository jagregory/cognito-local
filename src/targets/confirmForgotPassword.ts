import {
  ConfirmForgotPasswordRequest,
  ConfirmForgotPasswordResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { CodeMismatchError, UserNotFoundError } from "../errors";
import { Services } from "../services";
import { Target } from "./router";

export type ConfirmForgotPasswordTarget = Target<
  ConfirmForgotPasswordRequest,
  ConfirmForgotPasswordResponse
>;

type ConfirmForgotPasswordServices = Pick<
  Services,
  "cognito" | "clock" | "triggers"
>;

export const ConfirmForgotPassword =
  ({
    cognito,
    clock,
    triggers,
  }: ConfirmForgotPasswordServices): ConfirmForgotPasswordTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPoolForClientId(ctx, req.ClientId);
    const user = await userPool.getUserByUsername(ctx, req.Username);
    if (!user) {
      throw new UserNotFoundError();
    }

    if (user.ConfirmationCode !== req.ConfirmationCode) {
      throw new CodeMismatchError();
    }

    await userPool.saveUser(ctx, {
      ...user,
      UserLastModifiedDate: clock.get(),
      UserStatus: "CONFIRMED",
      ConfirmationCode: undefined,
      Password: req.Password,
    });

    if (triggers.enabled("PostConfirmation")) {
      await triggers.postConfirmation(ctx, {
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
