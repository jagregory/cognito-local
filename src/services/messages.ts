import { Context } from "./context";
import {
  DeliveryDetails,
  MessageDelivery,
} from "./messageDelivery/messageDelivery";
import { Triggers } from "./triggers";
import { User } from "./userPoolService";

const AWS_ADMIN_CLIENT_ID = "CLIENT_ID_NOT_APPLICABLE";

export interface Message {
  __code?: string; // not really part of the message, but we pass it around for convenience logging to the console
  emailMessage?: string;
  emailSubject?: string;
  smsMessage?: string;
}

type MessageSource =
  | "AdminCreateUser"
  | "Authentication"
  | "ForgotPassword"
  | "ResendCode"
  | "SignUp"
  | "UpdateUserAttribute"
  | "VerifyUserAttribute";

export interface Messages {
  deliver(
    ctx: Context,
    source: MessageSource,
    clientId: string | null,
    userPoolId: string,
    user: User,
    code: string,
    clientMetadata: Record<string, string> | undefined,
    deliveryDetails: DeliveryDetails
  ): Promise<void>;
}

export class MessagesService implements Messages {
  private readonly triggers: Triggers;
  private readonly messageDelivery: MessageDelivery;

  public constructor(triggers: Triggers, messageDelivery: MessageDelivery) {
    this.triggers = triggers;
    this.messageDelivery = messageDelivery;
  }

  public async deliver(
    ctx: Context,
    source: MessageSource,
    clientId: string | null,
    userPoolId: string,
    user: User,
    code: string,
    clientMetadata: Record<string, string> | undefined,
    deliveryDetails: DeliveryDetails
  ): Promise<void> {
    const message = await this.create(
      ctx,
      source,
      clientId,
      userPoolId,
      user,
      code,
      clientMetadata
    );

    await this.messageDelivery.deliver(ctx, user, deliveryDetails, message);
  }

  private async create(
    ctx: Context,
    source: MessageSource,
    clientId: string | null,
    userPoolId: string,
    user: User,
    code: string,
    clientMetadata: Record<string, string> | undefined
  ): Promise<Message> {
    if (this.triggers.enabled("CustomMessage")) {
      const message = await this.triggers.customMessage(ctx, {
        clientId: clientId ?? AWS_ADMIN_CLIENT_ID,
        clientMetadata,
        code,
        source: `CustomMessage_${source}`,
        userAttributes: user.Attributes,
        username: user.Username,
        userPoolId,
      });

      return {
        __code: code,
        ...message,
      };
    }

    // TODO: What should the default message be?
    return {
      __code: code,
    };
  }
}
