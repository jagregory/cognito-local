import { User } from "../userPool";

export interface CodeSender {
  sendEmail(user: User, destination: string, code: string): Promise<void>;
  sendSms(user: User, destination: string, code: string): Promise<void>;
}
