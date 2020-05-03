import boxen from "boxen";
import log from "../../log";
import { User } from "../userPoolClient";
import { CodeSender } from "./codeSender";

const sendToConsole = (
  user: User,
  destination: string,
  code: string
): Promise<void> => {
  log.info(
    boxen(
      `Confirmation Code Delivery

Username:    ${user.Username}
Destination: ${destination}
Code:        ${code}`,
      {
        borderStyle: "round" as any,
        borderColor: "yellow",
        padding: 1,
      }
    )
  );

  return Promise.resolve();
};

export const ConsoleCodeSender: CodeSender = {
  sendEmail: sendToConsole,
  sendSms: sendToConsole,
};
