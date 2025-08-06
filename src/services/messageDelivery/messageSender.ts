import type { Context } from "../context";
import type { Message } from "../messages";
import type { User } from "../userPoolService";

export interface MessageSender {
  sendEmail(
    ctx: Context,
    user: User,
    destination: string,
    message: Message,
  ): Promise<void>;
  sendSms(
    ctx: Context,
    user: User,
    destination: string,
    message: Message,
  ): Promise<void>;
}
