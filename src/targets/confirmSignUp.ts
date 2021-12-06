import {
  ConfirmSignUpRequest,
  ConfirmSignUpResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { CodeMismatchError, NotAuthorizedError } from "../errors";
import { Services } from "../services";
import { Target } from "./router";

export type ConfirmSignUpTarget = Target<
  ConfirmSignUpRequest,
  ConfirmSignUpResponse
>;

export const ConfirmSignUp =
  ({
    cognito,
    clock,
    triggers,
  }: Pick<Services, "cognito" | "clock" | "triggers">): ConfirmSignUpTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPoolForClientId(ctx, req.ClientId);
    const user = await userPool.getUserByUsername(ctx, req.Username);
    if (!user) {
      throw new NotAuthorizedError();
    }

    if (user.ConfirmationCode !== req.ConfirmationCode) {
      throw new CodeMismatchError();
    }

    await userPool.saveUser(ctx, {
      ...user,
      UserStatus: "CONFIRMED",
      ConfirmationCode: undefined,
      UserLastModifiedDate: clock.get(),
    });

    if (triggers.enabled("PostConfirmation")) {
      await triggers.postConfirmation(ctx, {
        clientId: req.ClientId,
        clientMetadata: req.ClientMetadata,
        source: "PostConfirmation_ConfirmSignUp",
        userAttributes: user.Attributes,
        username: user.Username,
        userPoolId: userPool.config.Id,
      });
    }

    return {};
  };
