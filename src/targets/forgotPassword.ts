import {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { UnsupportedError, UserNotFoundError } from "../errors";
import { Services } from "../services";
import { DeliveryDetails } from "../services/messageDelivery/messageDelivery";
import { attributeValue } from "../services/userPoolService";
import { Target } from "./Target";

export type ForgotPasswordTarget = Target<
  ForgotPasswordRequest,
  ForgotPasswordResponse
>;

type ForgotPasswordServices = Pick<
  Services,
  "cognito" | "clock" | "messages" | "otp"
>;

export const ForgotPassword =
  ({
    cognito,
    clock,
    messages,
    otp,
  }: ForgotPasswordServices): ForgotPasswordTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPoolForClientId(ctx, req.ClientId);
    const user = await userPool.getUserByUsername(ctx, req.Username);
    if (!user) {
      throw new UserNotFoundError();
    }

    const userEmail = attributeValue("email", user.Attributes);
    if (!userEmail) {
      throw new UnsupportedError("ForgotPassword without email on user");
    }

    // TODO: support UserMigration trigger

    const deliveryDetails: DeliveryDetails = {
      AttributeName: "email",
      DeliveryMedium: "EMAIL",
      Destination: userEmail,
    };

    const code = otp();
    await messages.deliver(
      ctx,
      "ForgotPassword",
      req.ClientId,
      userPool.options.Id,
      user,
      code,
      req.ClientMetadata,
      deliveryDetails
    );

    await userPool.saveUser(ctx, {
      ...user,
      UserLastModifiedDate: clock.get(),
      ConfirmationCode: code,
    });

    return {
      CodeDeliveryDetails: deliveryDetails,
    };
  };
