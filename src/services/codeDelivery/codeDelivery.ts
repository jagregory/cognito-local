import { User } from "../userPoolClient";
import { CodeSender } from "./codeSender";

export type DeliveryDetails =
  | {
      AttributeName: "email";
      DeliveryMedium: "EMAIL";
      Destination: string;
    }
  | {
      AttributeName: "phone_number";
      DeliveryMedium: "SMS";
      Destination: string;
    };

export type CodeDelivery = (
  code: string,
  user: User,
  deliveryDetails: DeliveryDetails
) => Promise<void>;

export const createCodeDelivery = (sender: CodeSender): CodeDelivery => async (
  code,
  user,
  deliveryDetails
) => {
  if (deliveryDetails.DeliveryMedium === "SMS") {
    await sender.sendSms(user, deliveryDetails.Destination, code);
  } else if (deliveryDetails.DeliveryMedium === "EMAIL") {
    await sender.sendEmail(user, deliveryDetails.Destination, code);
  }
};
