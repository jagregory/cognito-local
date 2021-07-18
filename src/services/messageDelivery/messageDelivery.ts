import { Message } from "../messages";
import { User } from "../userPoolClient";
import { MessageSender } from "./messageSender";

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

export type MessageDelivery = (
  user: User,
  deliveryDetails: DeliveryDetails,
  message: Message
) => Promise<void>;

export const createMessageDelivery = (
  sender: MessageSender
): MessageDelivery => async (user, deliveryDetails, message) => {
  if (deliveryDetails.DeliveryMedium === "SMS") {
    await sender.sendSms(user, deliveryDetails.Destination, message);
  } else if (deliveryDetails.DeliveryMedium === "EMAIL") {
    await sender.sendEmail(user, deliveryDetails.Destination, message);
  }
};
