import {
  VerifyUserAttributeRequest,
  VerifyUserAttributeResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { InvalidParameterError, NotAuthorizedError } from "../errors";
import { Services } from "../services";
import { Token } from "../services/tokenGenerator";
import { attribute, attributesAppend } from "../services/userPoolService";
import { Target } from "./router";

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
      // this might not be the right error
      throw new InvalidParameterError(
        `Unable to verify attribute: ${req.AttributeName} no value set to verify`
      );
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
