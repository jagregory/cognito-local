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

export interface MessageDelivery {
  deliver(
    user: User,
    deliveryDetails: DeliveryDetails,
    message: Message
  ): Promise<void>;
}

export class MessageDeliveryService implements MessageDelivery {
  private readonly sender: MessageSender;

  public constructor(sender: MessageSender) {
    this.sender = sender;
  }

  public async deliver(
    user: User,
    deliveryDetails: DeliveryDetails,
    message: Message
  ): Promise<void> {
    if (deliveryDetails.DeliveryMedium === "SMS") {
      await this.sender.sendSms(user, deliveryDetails.Destination, message);
    } else if (deliveryDetails.DeliveryMedium === "EMAIL") {
      await this.sender.sendEmail(user, deliveryDetails.Destination, message);
    }
  }
}
