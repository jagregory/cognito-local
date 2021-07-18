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

export const createMessages = (): Messages => {
  return {
    authentication: stubMessage,
    forgotPassword: stubMessage,
    signUp: stubMessage,
  };
};
