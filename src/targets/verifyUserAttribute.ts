import type {
  VerifyUserAttributeRequest,
  VerifyUserAttributeResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import {
  CodeMismatchError,
  InvalidParameterError,
  NotAuthorizedError,
} from "../errors";
import type { Services } from "../services";
import { verifyToken } from "../services/tokenVerifier";
import { attribute, attributesAppend } from "../services/userPoolService";
import type { Target } from "./Target";

export type VerifyUserAttributeTarget = Target<
  VerifyUserAttributeRequest,
  VerifyUserAttributeResponse
>;

type VerifyUserAttributeServices = Pick<
  Services,
  "clock" | "cognito" | "config"
>;

export const VerifyUserAttribute =
  ({
    clock,
    cognito,
    config,
  }: VerifyUserAttributeServices): VerifyUserAttributeTarget =>
  async (ctx, req) => {
    const decodedToken = (() => {
      try {
        return verifyToken(
          req.AccessToken,
          config.TokenConfig.VerifyTokens ?? false,
        );
      } catch {
        ctx.logger.info("Unable to verify token");
        throw new InvalidParameterError();
      }
    })();

    const userPool = await cognito.getUserPoolForClientId(
      ctx,
      decodedToken.client_id,
    );
    const user = await userPool.getUserByUsername(ctx, decodedToken.sub);
    if (!user) {
      throw new NotAuthorizedError();
    }

    if (req.Code !== user.AttributeVerificationCode) {
      throw new CodeMismatchError();
    }

    const attributesToUpdate = [
      ...user.Attributes,
      ...(user.UnverifiedAttributeChanges ?? []),
    ];

    if (req.AttributeName === "email") {
      await userPool.saveUser(ctx, {
        ...user,
        Attributes: attributesAppend(
          attributesToUpdate,
          attribute("email_verified", "true"),
        ),
        UserLastModifiedDate: clock.get(),
        UnverifiedAttributeChanges: undefined,
        AttributeVerificationCode: undefined,
      });
    } else if (req.AttributeName === "phone_number") {
      await userPool.saveUser(ctx, {
        ...user,
        Attributes: attributesAppend(
          attributesToUpdate,
          attribute("phone_number_verified", "true"),
        ),
        UserLastModifiedDate: clock.get(),
        UnverifiedAttributeChanges: undefined,
        AttributeVerificationCode: undefined,
      });
    } else {
      // not sure what to do here
    }

    return {};
  };
