import { Clock } from "../clock";
import { CognitoService } from "../cognitoService";
import { CryptoService } from "../crypto";
import { Lambda } from "../lambda";
import {
  CustomEmailSender,
  CustomEmailSenderTrigger,
} from "./customEmailSender";
import { CustomMessage, CustomMessageTrigger } from "./customMessage";
import {
  PostAuthentication,
  PostAuthenticationTrigger,
} from "./postAuthentication";
import { PostConfirmation, PostConfirmationTrigger } from "./postConfirmation";
import { PreSignUp, PreSignUpTrigger } from "./preSignUp";
import {
  PreTokenGenerationV1,
  PreTokenGenerationV1Trigger,
  PreTokenGenerationV2,
  PreTokenGenerationV2Trigger,
} from "./preTokenGeneration";
import { UserMigration, UserMigrationTrigger } from "./userMigration";

type SupportedTriggers =
  | "CustomEmailSender"
  | "CustomMessage"
  | "UserMigration"
  | "PostAuthentication"
  | "PostConfirmation"
  | "PreSignUp"
  | "PreTokenGenerationV1"
  | "PreTokenGenerationV2";

export interface Triggers {
  enabled(trigger: SupportedTriggers): boolean;
  customMessage: CustomMessageTrigger;
  customEmailSender: CustomEmailSenderTrigger;
  postAuthentication: PostAuthenticationTrigger;
  postConfirmation: PostConfirmationTrigger;
  preSignUp: PreSignUpTrigger;
  preTokenGenerationV1: PreTokenGenerationV1Trigger;
  preTokenGenerationV2: PreTokenGenerationV2Trigger;
  userMigration: UserMigrationTrigger;
}

export class TriggersService implements Triggers {
  private readonly lambda: Lambda;

  public readonly customMessage: CustomMessageTrigger;
  public readonly customEmailSender: CustomEmailSenderTrigger;
  public readonly postAuthentication: PostAuthenticationTrigger;
  public readonly postConfirmation: PostConfirmationTrigger;
  public readonly preSignUp: PreSignUpTrigger;
  public readonly preTokenGenerationV1: PreTokenGenerationV1Trigger;
  public readonly preTokenGenerationV2: PreTokenGenerationV2Trigger;
  public readonly userMigration: UserMigrationTrigger;

  public constructor(
    clock: Clock,
    cognitoClient: CognitoService,
    lambda: Lambda,
    crypto: CryptoService
  ) {
    this.lambda = lambda;

    this.customEmailSender = CustomEmailSender({ lambda, crypto });
    this.customMessage = CustomMessage({ lambda });
    this.postAuthentication = PostAuthentication({ lambda });
    this.postConfirmation = PostConfirmation({ lambda });
    this.preSignUp = PreSignUp({ lambda });
    this.preTokenGenerationV1 = PreTokenGenerationV1({ lambda });
    this.preTokenGenerationV2 = PreTokenGenerationV2({ lambda });
    this.userMigration = UserMigration({ clock, lambda, cognitoClient });
  }

  public enabled(trigger: SupportedTriggers): boolean {
    return this.lambda.enabled(trigger);
  }
}
