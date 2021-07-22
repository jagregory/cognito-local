export interface Message {
  __code?: string; // not really part of the message, but we pass it around for convenience logging to the console
  emailMessage?: string;
  emailSubject?: string;
  smsMessage?: string;
}

export interface Messages {
  authentication(code: string): Promise<Message>;
  forgotPassword(code: string): Promise<Message>;
  signUp(code: string): Promise<Message>;
}

const stubMessage = (code: string) =>
  Promise.resolve({
    __code: code,
  });

export class MessagesService implements Messages {
  public authentication(code: string): Promise<Message> {
    return stubMessage(code);
  }

  public async forgotPassword(code: string): Promise<Message> {
    return stubMessage(code);
  }

  public signUp(code: string): Promise<Message> {
    return stubMessage(code);
  }
}
