import { CodeDelivery } from "./codeDelivery/codeDelivery";
import { UserPool } from "./userPool";

export { UserPool } from "./userPool";
export { createCodeDelivery, CodeDelivery } from "./codeDelivery/codeDelivery";

export interface Services {
  storage: UserPool;
  codeDelivery: CodeDelivery;
}
