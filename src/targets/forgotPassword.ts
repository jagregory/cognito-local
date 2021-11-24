import { UnsupportedError, UserNotFoundError } from "../errors";
import { Services } from "../services";
import { DeliveryDetails } from "../services/messageDelivery/messageDelivery";
import { attributeValue } from "../services/userPoolClient";

interface Input {
  ClientId: string;
  Username: string;
}

interface Output {
  CodeDeliveryDetails: DeliveryDetails;
}

export type ForgotPasswordTarget = (body: Input) => Promise<Output>;

export const ForgotPassword = ({
  cognitoClient,
  clock,
  messageDelivery,
  messages,
  otp,
}: Pick<
  Services,
  "cognitoClient" | "clock" | "messageDelivery" | "messages" | "otp"
>): ForgotPasswordTarget => async (body) => {
  const userPool = await cognitoClient.getUserPoolForClientId(body.ClientId);
  const user = await userPool.getUserByUsername(body.Username);
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
    body.ClientId,
    userPool.config.Id,
    user,
    code
  );
  await messageDelivery.deliver(user, deliveryDetails, message);

  await userPool.saveUser({
    ...user,
    UserLastModifiedDate: Math.floor(clock.get().getTime() / 1000),
    ConfirmationCode: code,
  });

  return {
    CodeDeliveryDetails: deliveryDetails,
  };
};
