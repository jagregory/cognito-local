import { Context } from "./context";
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
  create(
    ctx: Context,
    source: MessageSource,
    clientId: string | null,
    userPoolId: string,
    user: User,
    code: string,
    clientMetadata: Record<string, string> | undefined
  ): Promise<Message>;
}

export class MessagesService implements Messages {
  private readonly triggers: Triggers;

  public constructor(triggers: Triggers) {
    this.triggers = triggers;
  }

  public async create(
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
