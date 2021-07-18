import { Triggers } from "./triggers";
import { CodeDelivery } from "./codeDelivery/codeDelivery";
import { CognitoClient } from "./cognitoClient";

export { CognitoClient } from "./cognitoClient";
export { UserPoolClient } from "./userPoolClient";
export { createCodeDelivery, CodeDelivery } from "./codeDelivery/codeDelivery";

export interface Services {
  cognitoClient: CognitoClient;
  codeDelivery: CodeDelivery;
  otp: () => string;
  triggers: Triggers;
}
