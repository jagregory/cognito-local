import {
  VerifyUserAttributeRequest,
  VerifyUserAttributeResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import {
  CodeMismatchError,
  InvalidParameterError,
  NotAuthorizedError,
} from "../errors";
import { Services } from "../services";
import { Token } from "../services/tokenGenerator";
import { attribute, attributesAppend } from "../services/userPoolService";
import { Target } from "../server/Router";

export type VerifyUserAttributeTarget = Target<
  VerifyUserAttributeRequest,
  VerifyUserAttributeResponse
>;

type VerifyUserAttributeServices = Pick<Services, "clock" | "cognito">;

export const VerifyUserAttribute =
  ({
    clock,
    cognito,
  }: VerifyUserAttributeServices): VerifyUserAttributeTarget =>
  async (ctx, req) => {
    const decodedToken = jwt.decode(req.AccessToken) as Token | null;
    if (!decodedToken) {
      ctx.logger.info("Unable to decode token");
      throw new InvalidParameterError();
    }

    const userPool = await cognito.getUserPoolForClientId(
      ctx,
      decodedToken.client_id
    );
    const user = await userPool.getUserByUsername(ctx, decodedToken.sub);
    if (!user) {
      throw new NotAuthorizedError();
    }

    if (req.Code !== user.AttributeVerificationCode) {
      throw new CodeMismatchError();
    }

    if (req.AttributeName === "email") {
      await userPool.saveUser(ctx, {
        ...user,
        Attributes: attributesAppend(
          user.Attributes,
          attribute("email_verified", "true")
        ),
        UserLastModifiedDate: clock.get(),
      });
    } else if (req.AttributeName === "phone_number") {
      await userPool.saveUser(ctx, {
        ...user,
        Attributes: attributesAppend(
          user.Attributes,
          attribute("phone_number_verified", "true")
        ),
        UserLastModifiedDate: clock.get(),
      });
    } else {
      // not sure what to do here
    }

    return {};
  };
