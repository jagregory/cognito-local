import boxen from "boxen";
import log from "../../log";
import { Message } from "../messages";
import { User } from "../userPoolClient";
import { MessageSender } from "./messageSender";

const sendToConsole = (
  user: User,
  destination: string,
  { __code, ...message }: Message
): Promise<void> => {
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

  log.info(
    boxen(`Confirmation Code Delivery\n\n${formattedFields.join("\n")}`, {
      borderStyle: "round" as any,
      borderColor: "yellow",
      padding: 1,
    })
  );

  return Promise.resolve();
};

export const ConsoleMessageSender: MessageSender = {
  sendEmail: sendToConsole,
  sendSms: sendToConsole,
};
