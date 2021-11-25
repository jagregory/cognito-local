import {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { UnsupportedError, UserNotFoundError } from "../errors";
import { Services } from "../services";
import { DeliveryDetails } from "../services/messageDelivery/messageDelivery";
import { attributeValue } from "../services/userPoolClient";

export type ForgotPasswordTarget = (
  req: ForgotPasswordRequest
) => Promise<ForgotPasswordResponse>;

type ForgotPasswordServices = Pick<
  Services,
  "cognitoClient" | "clock" | "messageDelivery" | "messages" | "otp"
>;

export const ForgotPassword = ({
  cognitoClient,
  clock,
  messageDelivery,
  messages,
  otp,
}: ForgotPasswordServices): ForgotPasswordTarget => async (req) => {
  const userPool = await cognitoClient.getUserPoolForClientId(req.ClientId);
  const user = await userPool.getUserByUsername(req.Username);
  if (!user) {
    throw new UserNotFoundError();
  }

  const userEmail = attributeValue("email", user.Attributes);
  if (!userEmail) {
    throw new UnsupportedError("ForgotPassword without email on user");
  }

  const deliveryDetails: DeliveryDetails = {
    AttributeName: "email",
    DeliveryMedium: "EMAIL",
    Destination: userEmail,
  };

  const code = otp();
  const message = await messages.forgotPassword(
    req.ClientId,
    userPool.config.Id,
    user,
    code
  );
  await messageDelivery.deliver(user, deliveryDetails, message);

  await userPool.saveUser({
    ...user,
    UserLastModifiedDate: clock.get().getTime(),
    ConfirmationCode: code,
  });

  return {
    CodeDeliveryDetails: deliveryDetails,
  };
};