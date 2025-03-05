import {
  SignUpRequest,
  SignUpResponse,
  UserStatusType,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import * as uuid from "uuid";
import { InvalidParameterError, UsernameExistsError } from "../errors";
import { Messages, Services, UserPoolService } from "../services";
import { selectAppropriateDeliveryMethod } from "../services/messageDelivery/deliveryMethod";
import { DeliveryDetails } from "../services/messageDelivery/messageDelivery";
import {
  attribute,
  attributesAppend,
  attributesInclude,
  attributeValue,
  User,
} from "../services/userPoolService";
import { Target } from "./Target";
import { Context } from "../services/context";

export type SignUpTarget = Target<SignUpRequest, SignUpResponse>;

type SignUpServices = Pick<
  Services,
  "clock" | "cognito" | "messages" | "otp" | "triggers" | "config"
>;

const deliverWelcomeMessage = async (
  ctx: Context,
  code: string,
  clientId: string,
  user: User,
  userPool: UserPoolService,
  messages: Messages,
  clientMetadata: Record<string, string> | undefined
): Promise<DeliveryDetails | null> => {
  const deliveryDetails = selectAppropriateDeliveryMethod(
    userPool.options.AutoVerifiedAttributes ?? [],
    user
  );
  if (!deliveryDetails && !userPool.options.AutoVerifiedAttributes) {
    // From the console: When Cognito's default verification method is not enabled, you must use APIs or Lambda triggers
    // to verify phone numbers and email addresses as well as to confirm user accounts.
    return null;
  } else if (!deliveryDetails) {
    // TODO: I don't know what the real error message should be for this
    throw new InvalidParameterError(
      "User has no attribute matching desired auto verified attributes"
    );
  }

  await messages.deliver(
    ctx,
    "SignUp",
    clientId,
    userPool.options.Id,
    user,
    code,
    clientMetadata,
    deliveryDetails
  );

  return deliveryDetails;
};

export const SignUp =
  ({
    clock,
    cognito,
    messages,
    otp,
    triggers,
    config,
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

    const isEmailUsername =
      config.UserPoolDefaults.UsernameAttributes?.includes("email");
    const hasEmailAttribute = attributesInclude("email", attributes);

    if (triggers.enabled("PreSignUp")) {
      const { autoConfirmUser, autoVerifyEmail, autoVerifyPhone } =
        await triggers.preSignUp(ctx, {
          clientId: req.ClientId,
          clientMetadata: req.ClientMetadata,
          source: "PreSignUp_SignUp",
          userAttributes: attributes,
          username: req.Username,
          userPoolId: userPool.options.Id,
          validationData: undefined,
        });

      if (autoConfirmUser) {
        userStatus = "CONFIRMED";
      }

      if (isEmailUsername && !hasEmailAttribute) {
        attributes.push({ Name: "email", Value: req.Username });
      }
      if (isEmailUsername || hasEmailAttribute) {
        if (autoVerifyEmail) {
          attributes.push({ Name: "email_verified", Value: "true" });
        } else {
          attributes.push({ Name: "email_verified", Value: "false" });
        }
      }
      if (attributesInclude("phone_number", attributes)) {
        if (autoVerifyPhone) {
          attributes.push({ Name: "phone_number_verified", Value: "true" });
        } else {
          attributes.push({ Name: "phone_number_verified", Value: "false" });
        }
      }
    } else {
      if (isEmailUsername || hasEmailAttribute) {
        attributes.push({ Name: "email_verified", Value: "false" });
      }
      if (attributesInclude("phone_number", attributes)) {
        attributes.push({ Name: "phone_number_verified", Value: "false" });
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
        userPoolId: userPool.options.Id,

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
