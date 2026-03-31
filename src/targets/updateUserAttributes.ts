import type {
  UpdateUserAttributesRequest,
  UpdateUserAttributesResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { InvalidParameterError, NotAuthorizedError } from "../errors";
import type { Messages, Services, UserPoolService } from "../services";
import { USER_POOL_AWS_DEFAULTS } from "../services/cognitoService";
import type { Context } from "../services/context";
import { selectAppropriateDeliveryMethod } from "../services/messageDelivery/deliveryMethod";
import { verifyToken } from "../services/tokenVerifier";
import {
  attributesAppend,
  hasUnverifiedContactAttributes,
  splitImmediateAndDelayedAttributes,
  type User,
  validatePermittedAttributeChanges,
} from "../services/userPoolService";
import type { Target } from "./Target";

const sendAttributeVerificationCode = async (
  ctx: Context,
  userPool: UserPoolService,
  user: User,
  messages: Messages,
  req: UpdateUserAttributesRequest,
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
    "UpdateUserAttribute",
    null,
    userPool.options.Id,
    user,
    code,
    req.ClientMetadata,
    deliveryDetails,
  );

  return deliveryDetails;
};

export type UpdateUserAttributesTarget = Target<
  UpdateUserAttributesRequest,
  UpdateUserAttributesResponse
>;

type UpdateUserAttributesServices = Pick<
  Services,
  "clock" | "cognito" | "config" | "otp" | "messages"
>;

export const UpdateUserAttributes =
  ({
    clock,
    cognito,
    config,
    otp,
    messages,
  }: UpdateUserAttributesServices): UpdateUserAttributesTarget =>
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

    const permittedAttributeChanges = validatePermittedAttributeChanges(
      req.UserAttributes,
      userPool.options.SchemaAttributes ??
        USER_POOL_AWS_DEFAULTS.SchemaAttributes ??
        [],
    );

    const [immediateAttributes, delayedAttributes] =
      splitImmediateAndDelayedAttributes(
        permittedAttributeChanges,
        userPool.options.UserAttributeUpdateSettings
          ?.AttributesRequireVerificationBeforeUpdate,
      );

    const updatedUser: User = {
      ...user,
      Attributes: attributesAppend(user.Attributes, ...immediateAttributes),
      UserLastModifiedDate: clock.get(),
      UnverifiedAttributeChanges:
        delayedAttributes.length > 0 ? delayedAttributes : undefined,
    };

    await userPool.saveUser(ctx, updatedUser);

    if (
      userPool.options.AutoVerifiedAttributes?.length &&
      (hasUnverifiedContactAttributes(immediateAttributes) ||
        hasUnverifiedContactAttributes(delayedAttributes))
    ) {
      const code = otp();

      await userPool.saveUser(ctx, {
        ...updatedUser,
        AttributeVerificationCode: code,
      });

      const deliveryDetails = await sendAttributeVerificationCode(
        ctx,
        userPool,
        updatedUser,
        messages,
        req,
        code,
      );

      return {
        CodeDeliveryDetailsList: [deliveryDetails],
      };
    }

    return {
      CodeDeliveryDetailsList: [],
    };
  };
