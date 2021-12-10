import {
  GetUserAttributeVerificationCodeRequest,
  GetUserAttributeVerificationCodeResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { Messages, Services, UserPoolService } from "../services";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import { selectAppropriateDeliveryMethod } from "../services/messageDelivery/deliveryMethod";
import { Token } from "../services/tokenGenerator";
import { User } from "../services/userPoolService";
import { Context, Target } from "./router";

const sendAttributeVerificationCode = async (
  ctx: Context,
  userPool: UserPoolService,
  user: User,
  messages: Messages,
  req: GetUserAttributeVerificationCodeRequest,
  code: string
) => {
  const deliveryDetails = selectAppropriateDeliveryMethod(
    userPool.config.AutoVerifiedAttributes ?? [],
    user
  );
  if (!deliveryDetails) {
    // TODO: I don't know what the real error message should be for this
    throw new InvalidParameterError(
      "User has no attribute matching desired auto verified attributes"
    );
  }

  await messages.deliver(
    ctx,
    "VerifyUserAttribute",
    null,
    userPool.config.Id,
    user,
    code,
    req.ClientMetadata,
    deliveryDetails
  );
};

export type GetUserAttributeVerificationCodeTarget = Target<
  GetUserAttributeVerificationCodeRequest,
  GetUserAttributeVerificationCodeResponse
>;

type GetUserAttributeVerificationCodeServices = Pick<
  Services,
  "cognito" | "otp" | "messages"
>;

export const GetUserAttributeVerificationCode =
  ({
    cognito,
    otp,
    messages,
  }: GetUserAttributeVerificationCodeServices): GetUserAttributeVerificationCodeTarget =>
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
      throw new UserNotFoundError();
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
      code
    );

    return {};
  };
