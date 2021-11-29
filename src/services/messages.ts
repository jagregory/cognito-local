import { Triggers } from "./triggers";
import { User } from "./userPoolService";

const AWS_ADMIN_CLIENT_ID = "CLIENT_ID_NOT_APPLICABLE";

export interface Message {
  __code?: string; // not really part of the message, but we pass it around for convenience logging to the console
  emailMessage?: string;
  emailSubject?: string;
  smsMessage?: string;
}

export interface Messages {
  adminCreateUser(
    userPoolId: string,
    user: User,
    temporaryPassword: string,
    clientMetadata: Record<string, string> | undefined
  ): Promise<Message>;
  authentication(
    clientId: string,
    userPoolId: string,
    user: User,
    code: string,
    clientMetadata: Record<string, string> | undefined
  ): Promise<Message>;
  forgotPassword(
    clientId: string,
    userPoolId: string,
    user: User,
    code: string,
    clientMetadata: Record<string, string> | undefined
  ): Promise<Message>;
  signUp(
    clientId: string,
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

  public async adminCreateUser(
    userPoolId: string,
    user: User,
    temporaryPassword: string,
    clientMetadata: Record<string, string> | undefined
  ): Promise<Message> {
    if (this.triggers.enabled("CustomMessage")) {
      const message = await this.triggers.customMessage({
        clientId: AWS_ADMIN_CLIENT_ID,
        clientMetadata,
        code: temporaryPassword,
        source: "CustomMessage_AdminCreateUser",
        userAttributes: user.Attributes,
        username: user.Username,
        userPoolId,
      });

      return {
        __code: temporaryPassword,
        ...message,
      };
    }

    // TODO: What should the default message be?
    return {
      __code: temporaryPassword,
    };
  }

  public async authentication(
    clientId: string,
    userPoolId: string,
    user: User,
    code: string,
    clientMetadata: Record<string, string> | undefined
  ): Promise<Message> {
    if (this.triggers.enabled("CustomMessage")) {
      const message = await this.triggers.customMessage({
        clientId,
        clientMetadata,
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
    code: string,
    clientMetadata: Record<string, string> | undefined
  ): Promise<Message> {
    if (this.triggers.enabled("CustomMessage")) {
      const message = await this.triggers.customMessage({
        clientId,
        clientMetadata,
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
    code: string,
    clientMetadata: Record<string, string> | undefined
  ): Promise<Message> {
    if (this.triggers.enabled("CustomMessage")) {
      const message = await this.triggers.customMessage({
        clientId,
        clientMetadata,
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
