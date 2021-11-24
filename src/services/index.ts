import { Clock } from "./clock";
import { Messages } from "./messages";
import { Triggers } from "./triggers";
import { MessageDelivery } from "./messageDelivery/messageDelivery";
import { CognitoClient } from "./cognitoClient";

export { CognitoClient, CognitoClientService } from "./cognitoClient";
export { UserPoolClient, UserPoolClientService } from "./userPoolClient";
export { Triggers, TriggersService } from "./triggers";
export { Lambda, LambdaService } from "./lambda";
export { MessageDelivery } from "./messageDelivery/messageDelivery";
export { Messages, MessagesService } from "./messages";

export interface Services {
  clock: Clock;
  cognitoClient: CognitoClient;
  messageDelivery: MessageDelivery;
  messages: Messages;
  otp: () => string;
  triggers: Triggers;
}
