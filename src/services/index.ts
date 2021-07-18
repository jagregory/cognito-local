import { Messages } from "./messages";
import { Triggers } from "./triggers";
import { MessageDelivery } from "./messageDelivery/messageDelivery";
import { CognitoClient } from "./cognitoClient";

export { CognitoClient } from "./cognitoClient";
export { UserPoolClient } from "./userPoolClient";
export {
  createMessageDelivery,
  MessageDelivery,
} from "./messageDelivery/messageDelivery";

export interface Services {
  cognitoClient: CognitoClient;
  messageDelivery: MessageDelivery;
  messages: Messages;
  otp: () => string;
  triggers: Triggers;
}
