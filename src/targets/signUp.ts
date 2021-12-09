import {
  SignUpRequest,
  SignUpResponse,
  UserStatusType,
  VerifiedAttributesListType,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import * as uuid from "uuid";
import { InvalidParameterError, UsernameExistsError } from "../errors";
import {
  MessageDelivery,
  Messages,
  Services,
  UserPoolService,
} from "../services";
import { DeliveryDetails } from "../services/messageDelivery/messageDelivery";
import {
  attribute,
  attributesAppend,
  attributesInclude,
  attributeValue,
  User,
} from "../services/userPoolService";
import { Context, Target } from "./router";

export type SignUpTarget = Target<SignUpRequest, SignUpResponse>;

type SignUpServices = Pick<
  Services,
  "clock" | "cognito" | "messages" | "messageDelivery" | "otp" | "triggers"
>;

const selectAppropriateDeliveryMethod = (
  desiredDeliveryMediums: VerifiedAttributesListType,
  user: User
): DeliveryDetails | null => {
  if (desiredDeliveryMediums.includes("phone_number")) {
    const phoneNumber = attributeValue("phone_number", user.Attributes);
    if (phoneNumber) {
      return {
        AttributeName: "phone_number",
        DeliveryMedium: "SMS",
        Destination: phoneNumber,
      };
    }
  }

  if (desiredDeliveryMediums.includes("email")) {
    const email = attributeValue("email", user.Attributes);
    if (email) {
      return {
        AttributeName: "email",
        DeliveryMedium: "EMAIL",
        Destination: email,
      };
    }
  }

  return null;
};

const deliverWelcomeMessage = async (
  ctx: Context,
  code: string,
  clientId: string,
  user: User,
  userPool: UserPoolService,
  messages: Messages,
  messageDelivery: MessageDelivery,
  clientMetadata: Record<string, string> | undefined
): Promise<DeliveryDetails | null> => {
  const deliveryDetails = selectAppropriateDeliveryMethod(
    userPool.config.AutoVerifiedAttributes ?? [],
    user
  );
  if (!deliveryDetails && !userPool.config.AutoVerifiedAttributes) {
    // From the console: When Cognito's default verification method is not enabled, you must use APIs or Lambda triggers
    // to verify phone numbers and email addresses as well as to confirm user accounts.
    return null;
  } else if (!deliveryDetails) {
    // TODO: I don't know what the real error message should be for this
    throw new InvalidParameterError(
      "User has no attribute matching desired auto verified attributes"
    );
  }

  const message = await messages.signUp(
    ctx,
    clientId,
    userPool.config.Id,
    user,
    code,
    clientMetadata
  );
  await messageDelivery.deliver(ctx, user, deliveryDetails, message);

  return deliveryDetails;
};

export const SignUp =
  ({
    clock,
    cognito,
    messageDelivery,
    messages,
    otp,
    triggers,
  }: SignUpServices): SignUpTarget =>
  async (ctx, req) => {
    // TODO: This should behave differently depending on if PreventUserExistenceErrors
    // is enabled on the updatedUser pool. This will be the default after Feb 2020.
    // See: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-managing-errors.html
    const userPool = await cognito.getUserPoolForClientId(ctx, req.ClientId);
    const existingUser = await userPool.getUserByUsername(ctx, req.Username);
    if (existingUser) {
      throw new UsernameExistsError();
    }

    const attributes = attributesInclude("sub", req.UserAttributes)
      ? req.UserAttributes ?? []
      : [{ Name: "sub", Value: uuid.v4() }, ...(req.UserAttributes ?? [])];
    let userStatus: UserStatusType = "UNCONFIRMED";

    if (triggers.enabled("PreSignUp")) {
      const { autoConfirmUser, autoVerifyEmail, autoVerifyPhone } =
        await triggers.preSignUp(ctx, {
          clientId: req.ClientId,
          clientMetadata: req.ClientMetadata,
          source: "PreSignUp_SignUp",
          userAttributes: attributes,
          username: req.Username,
          userPoolId: userPool.config.Id,
          validationData: undefined,
        });

      if (autoConfirmUser) {
        userStatus = "CONFIRMED";
      }
      if (attributesInclude("email", attributes) && autoVerifyEmail) {
        attributes.push({ Name: "email_verified", Value: "true" });
      }
      if (attributesInclude("phone_number", attributes) && autoVerifyPhone) {
        attributes.push({ Name: "phone_number_verified", Value: "true" });
      }
    }

    const now = clock.get();

    const updatedUser: User = {
      Attributes: attributes,
      Enabled: true,
      Password: req.Password,
      RefreshTokens: [],
      UserCreateDate: now,
      UserLastModifiedDate: now,
      Username: req.Username,
      UserStatus: userStatus,
    };

    const code = otp();

    const deliveryDetails = await deliverWelcomeMessage(
      ctx,
      code,
      req.ClientId,
      updatedUser,
      userPool,
      messages,
      messageDelivery,
      req.ClientMetadata
    );

    await userPool.saveUser(ctx, {
      ...updatedUser,
      ConfirmationCode: code,
    });

    if (
      updatedUser.UserStatus === "CONFIRMED" &&
      triggers.enabled("PostConfirmation")
    ) {
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

    return {
      CodeDeliveryDetails: deliveryDetails ?? undefined,
      UserConfirmed: updatedUser.UserStatus === "CONFIRMED",
      UserSub: attributeValue("sub", updatedUser.Attributes) as string,
    };
  };
