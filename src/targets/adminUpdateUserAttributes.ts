import {
  AdminUpdateUserAttributesRequest,
  AdminUpdateUserAttributesResponse,
  AttributeListType,
  SchemaAttributesListType,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Messages, Services, UserPoolService } from "../services";
import { InvalidParameterError, NotAuthorizedError } from "../errors";
import { USER_POOL_AWS_DEFAULTS } from "../services/cognitoService";
import { selectAppropriateDeliveryMethod } from "../services/messageDelivery/deliveryMethod";
import {
  attribute,
  attributesAppend,
  attributesInclude,
  attributeValue,
  User,
} from "../services/userPoolService";
import { Context, Target } from "./router";

const validatePermittedAttributeChanges = (
  requestAttributes: AttributeListType,
  schemaAttributes: SchemaAttributesListType
): AttributeListType => {
  for (const attr of requestAttributes) {
    const attrSchema = schemaAttributes.find((x) => x.Name === attr.Name);
    if (!attrSchema) {
      throw new InvalidParameterError(
        `user.${attr.Name}: Attribute does not exist in the schema.`
      );
    }
    if (!attrSchema.Mutable) {
      throw new InvalidParameterError(
        `user.${attr.Name}: Attribute cannot be updated. (changing an immutable attribute)`
      );
    }
  }

  if (
    attributesInclude("email_verified", requestAttributes) &&
    !attributesInclude("email", requestAttributes)
  ) {
    throw new InvalidParameterError(
      "Email is required to verify/un-verify an email"
    );
  }

  if (
    attributesInclude("phone_number_verified", requestAttributes) &&
    !attributesInclude("phone_number", requestAttributes)
  ) {
    throw new InvalidParameterError(
      "Phone Number is required to verify/un-verify a phone number"
    );
  }

  return requestAttributes;
};

const defaultVerifiedAttributesIfModified = (
  attributes: AttributeListType
): AttributeListType => {
  const attributesToSet = [...attributes];
  if (
    attributesInclude("email", attributes) &&
    !attributesInclude("email_verified", attributes)
  ) {
    attributesToSet.push(attribute("email_verified", "false"));
  }
  if (
    attributesInclude("phone_number", attributes) &&
    !attributesInclude("phone_number_verified", attributes)
  ) {
    attributesToSet.push(attribute("phone_number_verified", "false"));
  }
  return attributesToSet;
};

const hasUnverifiedContactAttributes = (
  userAttributesToSet: AttributeListType
): boolean =>
  attributeValue("email_verified", userAttributesToSet) === "false" ||
  attributeValue("phone_number_verified", userAttributesToSet) === "false";

const sendAttributeVerificationCode = async (
  ctx: Context,
  userPool: UserPoolService,
  user: User,
  messages: Messages,
  req: AdminUpdateUserAttributesRequest,
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
    "UpdateUserAttribute",
    null,
    userPool.config.Id,
    user,
    code,
    req.ClientMetadata,
    deliveryDetails
  );
};

export type AdminUpdateUserAttributesTarget = Target<
  AdminUpdateUserAttributesRequest,
  AdminUpdateUserAttributesResponse
>;

type AdminUpdateUserAttributesServices = Pick<
  Services,
  "clock" | "cognito" | "otp" | "messages"
>;

export const AdminUpdateUserAttributes =
  ({
    clock,
    cognito,
    otp,
    messages,
  }: AdminUpdateUserAttributesServices): AdminUpdateUserAttributesTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const user = await userPool.getUserByUsername(ctx, req.Username);
    if (!user) {
      throw new NotAuthorizedError();
    }

    const userAttributesToSet = defaultVerifiedAttributesIfModified(
      validatePermittedAttributeChanges(
        req.UserAttributes,
        // if the user pool doesn't have any SchemaAttributes it was probably created manually
        // or before we started explicitly saving the defaults. Fallback on the AWS defaults in
        // this case, otherwise checks against the schema for default attributes like email will
        // fail.
        userPool.config.SchemaAttributes ??
          USER_POOL_AWS_DEFAULTS.SchemaAttributes ??
          []
      )
    );

    const updatedUser = {
      ...user,
      Attributes: attributesAppend(user.Attributes, ...userAttributesToSet),
      UserLastModifiedDate: clock.get(),
    };

    await userPool.saveUser(ctx, updatedUser);

    // deliberately only check the affected user attributes, not the combined attributes
    // e.g. a user with email_verified=false that you don't touch the email attributes won't get notified
    if (
      userPool.config.AutoVerifiedAttributes?.length &&
      hasUnverifiedContactAttributes(userAttributesToSet)
    ) {
      const code = otp();

      await userPool.saveUser(ctx, {
        ...updatedUser,
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
    }

    return {};
  };
