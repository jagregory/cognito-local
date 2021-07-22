import { UserNotFoundError } from "../errors";
import { Services } from "../services";
import { DeliveryDetails } from "../services/messageDelivery/messageDelivery";

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
  messageDelivery,
  messages,
  otp,
}: Pick<
  Services,
  "cognitoClient" | "messageDelivery" | "messages" | "otp"
>): ForgotPasswordTarget => async (body) => {
  const userPool = await cognitoClient.getUserPoolForClientId(body.ClientId);
  const user = await userPool.getUserByUsername(body.Username);
  if (!user) {
    throw new UserNotFoundError();
  }

  const deliveryDetails: DeliveryDetails = {
    AttributeName: "email",
    DeliveryMedium: "EMAIL",
    Destination: user.Attributes.filter((x) => x.Name === "email").map(
      (x) => x.Value
    )[0],
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
    UserLastModifiedDate: new Date().getTime(),
    ConfirmationCode: code,
  });

  return {
    CodeDeliveryDetails: deliveryDetails,
  };
};
