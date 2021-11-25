import boxen from "boxen";
import { Logger } from "../../log";
import { Message } from "../messages";
import { User } from "../userPoolService";
import { MessageSender } from "./messageSender";

export class ConsoleMessageSender implements MessageSender {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public sendEmail(
    user: User,
    destination: string,
    message: Message
  ): Promise<void> {
    return this.sendToConsole(user, destination, message);
  }

  public sendSms(
    user: User,
    destination: string,
    message: Message
  ): Promise<void> {
    return this.sendToConsole(user, destination, message);
  }

  private sendToConsole(
    user: User,
    destination: string,
    { __code, ...message }: Message
  ): Promise<void> {
    const fields = {
      Username: user.Username,
      Destination: destination,
      Code: __code,
      "Email Subject": message.emailSubject,
      "Email Message": message.emailMessage,
      "SMS Message": message.smsMessage,
    };
    const definedFields = Object.entries(fields).filter(
      (kv): kv is [string, string] => !!kv[1]
    );

    const longestDefinedFieldName = Math.max(
      ...definedFields.map(([k]) => k.length)
    );
    const formattedFields = definedFields.map(
      ([k, v]) => `${(k + ":").padEnd(longestDefinedFieldName + 1)} ${v}`
    );

    this.logger.info(
      boxen(`Confirmation Code Delivery\n\n${formattedFields.join("\n")}`, {
        borderStyle: "round" as any,
        borderColor: "yellow",
        padding: 1,
      })
    );

    return Promise.resolve();
  }
}
