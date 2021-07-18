import { Message } from "../messages";
import { User } from "../userPoolClient";

export interface MessageSender {
  sendEmail(user: User, destination: string, message: Message): Promise<void>;
  sendSms(user: User, destination: string, message: Message): Promise<void>;
}
