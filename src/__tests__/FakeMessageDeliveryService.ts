import type { Context } from "../services/context";
import type {
  DeliveryDetails,
  MessageDelivery,
} from "../services/messageDelivery/messageDelivery";
import type { Message } from "../services/messages";
import type { User } from "../services/userPoolService";

interface CollectedMessage {
  readonly deliveryDetails: DeliveryDetails;
  readonly message: Message;
}

export class FakeMessageDeliveryService implements MessageDelivery {
  private readonly messages: CollectedMessage[] = [];

  public get collectedMessages(): readonly CollectedMessage[] {
    return [...this.messages];
  }

  deliver(
    _ctx: Context,
    _user: User,
    deliveryDetails: DeliveryDetails,
    message: Message,
  ): Promise<void> {
    this.messages.push({
      deliveryDetails,
      message,
    });
    return Promise.resolve();
  }
}
