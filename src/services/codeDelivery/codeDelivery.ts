import { User } from "../userPoolClient";
import { CodeSender } from "./codeSender";

export type DeliveryDetails =
  | {
      AttributeName: "email";
      DeliveryMedium: "EMAIL";
      Destination: string;
    }
  | { AttributeName: "phone"; DeliveryMedium: "SMS"; Destination: string };

export type CodeDelivery = (
  user: User,
  deliveryDetails: DeliveryDetails
) => Promise<string>;

export const createCodeDelivery = (
  sender: CodeSender,
  otp: () => string
): CodeDelivery => async (user, deliveryDetails): Promise<string> => {
  const code = otp();

  if (deliveryDetails.DeliveryMedium === "SMS") {
    await sender.sendSms(user, deliveryDetails.Destination, code);
  } else if (deliveryDetails.DeliveryMedium === "EMAIL") {
    await sender.sendEmail(user, deliveryDetails.Destination, code);
  }

  return Promise.resolve(code);
};
