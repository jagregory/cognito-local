import type { Config } from "../server/config";
import type { Clock } from "./clock";
import type { CognitoService } from "./cognitoService";
import type { Messages } from "./messages";
import type { TokenGenerator } from "./tokenGenerator";
import type { Triggers } from "./triggers";

export { Clock, DateClock } from "./clock";
export { CognitoService, CognitoServiceImpl } from "./cognitoService";
export { Lambda, LambdaService } from "./lambda";
export { Messages, MessagesService } from "./messages";
export { Triggers, TriggersService } from "./triggers";
export { UserPoolService, UserPoolServiceImpl } from "./userPoolService";

export interface Services {
  clock: Clock;
  cognito: CognitoService;
  config: Config;
  messages: Messages;
  otp: () => string;
  tokenGenerator: TokenGenerator;
  triggers: Triggers;
}
