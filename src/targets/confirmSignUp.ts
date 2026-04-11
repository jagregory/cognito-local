import type {
  ConfirmSignUpRequest,
  ConfirmSignUpResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import {
  AliasExistsError,
  CodeMismatchError,
  ExpiredCodeError,
  NotAuthorizedError,
} from "../errors";
import type { Services } from "../services";
import {
  attribute,
  attributesAppend,
  attributeValue,
} from "../services/userPoolService";
import type { Target } from "./Target";

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

    if (!user.ConfirmationCode) {
      throw new ExpiredCodeError();
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

    // Handle alias attributes (email, phone_number, preferred_username)
    if (userPool.options.AliasAttributes?.length) {
      const allUsers = await userPool.listUsers(ctx);
      for (const aliasAttr of userPool.options.AliasAttributes) {
        const aliasValue = attributeValue(aliasAttr, updatedUser.Attributes);
        if (!aliasValue) continue;

        const conflictingUser = allUsers.find(
          (u) =>
            u.Username !== updatedUser.Username &&
            attributeValue(aliasAttr, u.Attributes) === aliasValue,
        );
        if (conflictingUser) {
          if (!req.ForceAliasCreation) {
            throw new AliasExistsError();
          }
          // Remove the conflicting attribute from the other user
          await userPool.saveUser(ctx, {
            ...conflictingUser,
            Attributes: conflictingUser.Attributes.filter(
              (a) => a.Name !== aliasAttr,
            ),
            UserLastModifiedDate: clock.get(),
          });
        }
      }
    }

    await userPool.saveUser(ctx, updatedUser);

    if (triggers.enabled("PostConfirmation")) {
      await triggers.postConfirmation(ctx, {
        clientId: req.ClientId,
        clientMetadata: req.ClientMetadata,
        source: "PostConfirmation_ConfirmSignUp",
        username: updatedUser.Username,
        userPoolId: userPool.options.Id,

        // not sure whether this is a one off for PostConfirmation, or whether we should be adding cognito:user_status
        // into every place we send attributes to lambdas
        userAttributes: attributesAppend(
          updatedUser.Attributes,
          attribute("cognito:user_status", updatedUser.UserStatus),
        ),
      });
    }

    return {};
  };
