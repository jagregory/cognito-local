import {
  ConfirmSignUpRequest,
  ConfirmSignUpResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { CodeMismatchError, NotAuthorizedError } from "../errors";
import { Services } from "../services";
import { attribute, attributesAppend } from "../services/userPoolService";
import { Target } from "../server/Router";

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

    const updatedUser = {
      ...user,
      UserStatus: "CONFIRMED",
      ConfirmationCode: undefined,
      UserLastModifiedDate: clock.get(),
    };

    await userPool.saveUser(ctx, updatedUser);

    if (triggers.enabled("PostConfirmation")) {
      await triggers.postConfirmation(ctx, {
        clientId: req.ClientId,
        clientMetadata: req.ClientMetadata,
        source: "PostConfirmation_ConfirmSignUp",
        username: updatedUser.Username,
        userPoolId: userPool.config.Id,

        // not sure whether this is a one off for PostConfirmation, or whether we should be adding cognito:user_status
        // into every place we send attributes to lambdas
        userAttributes: attributesAppend(
          updatedUser.Attributes,
          attribute("cognito:user_status", updatedUser.UserStatus)
        ),
      });
    }

    return {};
  };
