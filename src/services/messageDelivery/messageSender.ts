import { Context } from "../context";
import { Message } from "../messages";
import { User } from "../userPoolService";

export interface MessageSender {
  sendEmail(
    ctx: Context,
    user: User,
    destination: string,
    message: Message
  ): Promise<void>;
  sendSms(
    ctx: Context,
    user: User,
    destination: string,
    message: Message
  ): Promise<void>;
}
