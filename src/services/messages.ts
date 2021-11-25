import { Triggers } from "./triggers";
import { User } from "./userPoolClient";

export interface Message {
  __code?: string; // not really part of the message, but we pass it around for convenience logging to the console
  emailMessage?: string;
  emailSubject?: string;
  smsMessage?: string;
}

export interface Messages {
  authentication(code: string): Promise<Message>;
  forgotPassword(
    clientId: string,
    userPoolId: string,
    user: User,
    code: string
  ): Promise<Message>;
  signUp(code: string): Promise<Message>;
}

const stubMessage = (code: string) =>
  Promise.resolve({
    __code: code,
  });

export class MessagesService implements Messages {
  private readonly triggers: Triggers;

  public constructor(triggers: Triggers) {
    this.triggers = triggers;
  }

  public authentication(code: string): Promise<Message> {
    return stubMessage(code);
  }

  public async forgotPassword(
    clientId: string,
    userPoolId: string,
    user: User,
    code: string
  ): Promise<Message> {
    if (this.triggers.enabled("CustomMessage")) {
      const message = await this.triggers.customMessage({
        clientId,
        code,
        source: "CustomMessage_ForgotPassword",
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

  public signUp(code: string): Promise<Message> {
    return stubMessage(code);
  }
}
