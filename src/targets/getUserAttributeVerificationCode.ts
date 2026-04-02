import type {
  GetUserAttributeVerificationCodeRequest,
  GetUserAttributeVerificationCodeResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import {
  InvalidParameterError,
  NotAuthorizedError,
  UserNotFoundError,
} from "../errors";
import type { Messages, Services, UserPoolService } from "../services";
import type { Context } from "../services/context";
import { selectAppropriateDeliveryMethod } from "../services/messageDelivery/deliveryMethod";
import { isTokenRevoked, verifyToken } from "../services/tokenVerifier";
import type { User } from "../services/userPoolService";
import type { Target } from "./Target";

const sendAttributeVerificationCode = async (
  ctx: Context,
  userPool: UserPoolService,
  user: User,
  messages: Messages,
  req: GetUserAttributeVerificationCodeRequest,
  code: string,
) => {
  const deliveryDetails = selectAppropriateDeliveryMethod(
    userPool.options.AutoVerifiedAttributes ?? [],
    user,
  );
  if (!deliveryDetails) {
    // TODO: I don't know what the real error message should be for this
    throw new InvalidParameterError(
      "User has no attribute matching desired auto verified attributes",
    );
  }

  await messages.deliver(
    ctx,
    "VerifyUserAttribute",
    null,
    userPool.options.Id,
    user,
    code,
    req.ClientMetadata,
    deliveryDetails,
  );
};

export type GetUserAttributeVerificationCodeTarget = Target<
  GetUserAttributeVerificationCodeRequest,
  GetUserAttributeVerificationCodeResponse
>;

type GetUserAttributeVerificationCodeServices = Pick<
  Services,
  "cognito" | "config" | "otp" | "messages"
>;

export const GetUserAttributeVerificationCode =
  ({
    cognito,
    config,
    otp,
    messages,
  }: GetUserAttributeVerificationCodeServices): GetUserAttributeVerificationCodeTarget =>
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
      throw new UserNotFoundError();
    }

    if (isTokenRevoked(decodedToken, user.RevokedRefreshTokenJtis ?? [])) {
      throw new NotAuthorizedError();
    }

    const code = otp();

    await userPool.saveUser(ctx, {
      ...user,
      AttributeVerificationCode: code,
    });

    await sendAttributeVerificationCode(
      ctx,
      userPool,
      user,
      messages,
      req,
      code,
    );

    return {};
  };
