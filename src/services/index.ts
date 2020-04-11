import { Triggers } from "./triggers";
import { CodeDelivery } from "./codeDelivery/codeDelivery";
import { UserPool } from "./userPool";

export { UserPool } from "./userPool";
export { createCodeDelivery, CodeDelivery } from "./codeDelivery/codeDelivery";

export interface Services {
  userPool: UserPool;
  codeDelivery: CodeDelivery;
  triggers: Triggers;
}
