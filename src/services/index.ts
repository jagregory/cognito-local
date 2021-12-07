import { Config } from "../server/config";
import { Clock } from "./clock";
import { Messages } from "./messages";
import { TokenGenerator } from "./tokenGenerator";
import { Triggers } from "./triggers";
import { MessageDelivery } from "./messageDelivery/messageDelivery";
import { CognitoService } from "./cognitoService";

export { Clock, DateClock } from "./clock";
export { CognitoService, CognitoServiceImpl } from "./cognitoService";
export { UserPoolService, UserPoolServiceImpl } from "./userPoolService";
export { Triggers, TriggersService } from "./triggers";
export { Lambda, LambdaService } from "./lambda";
export { MessageDelivery } from "./messageDelivery/messageDelivery";
export { Messages, MessagesService } from "./messages";

export interface Services {
  clock: Clock;
  cognito: CognitoService;
  config: Config;
  messageDelivery: MessageDelivery;
  messages: Messages;
  otp: () => string;
  tokenGenerator: TokenGenerator;
  triggers: Triggers;
}
