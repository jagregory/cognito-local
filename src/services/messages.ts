import { Triggers } from "./triggers";
import { User } from "./userPoolClient";

export interface Message {
  __code?: string; // not really part of the message, but we pass it around for convenience logging to the console
  emailMessage?: string;
  emailSubject?: string;
  smsMessage?: string;
}

export interface Messages {
  authentication(
    clientId: string,
    userPoolId: string,
    user: User,
    code: string
  ): Promise<Message>;
  forgotPassword(
    clientId: string,
    userPoolId: string,
    user: User,
    code: string
  ): Promise<Message>;
  signUp(
    clientId: string,
    userPoolId: string,
    user: User,
    code: string
  ): Promise<Message>;
}

export class MessagesService implements Messages {
  private readonly triggers: Triggers;

  public constructor(triggers: Triggers) {
    this.triggers = triggers;
  }

  public async authentication(
    clientId: string,
    userPoolId: string,
    user: User,
    code: string
  ): Promise<Message> {
    if (this.triggers.enabled("CustomMessage")) {
      const message = await this.triggers.customMessage({
        clientId,
        code,
        source: "CustomMessage_Authentication",
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

  public async signUp(
    clientId: string,
    userPoolId: string,
    user: User,
    code: string
  ): Promise<Message> {
    if (this.triggers.enabled("CustomMessage")) {
      const message = await this.triggers.customMessage({
        clientId,
        code,
        source: "CustomMessage_SignUp",
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