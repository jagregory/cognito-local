import { UserNotFoundError } from "../errors";
import { Services } from "../services";
import { DeliveryDetails } from "../services/codeDelivery/codeDelivery";

interface Input {
  ClientId: string;
  Username: string;
}

interface Output {
  CodeDeliveryDetails: DeliveryDetails;
}

export type ForgotPasswordTarget = (body: Input) => Promise<Output>;

export const ForgotPassword = ({
  userPool,
  codeDelivery,
}: Services): ForgotPasswordTarget => async (body) => {
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

  const code = await codeDelivery(user, deliveryDetails);

  await userPool.saveUser({
    ...user,
    UserLastModifiedDate: new Date().getTime(),
    ConfirmationCode: code,
  });

  return {
    CodeDeliveryDetails: deliveryDetails,
  };
};
