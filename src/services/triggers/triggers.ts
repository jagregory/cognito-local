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
  PreTokenGeneration,
  PreTokenGenerationTrigger,
} from "./preTokenGeneration";
import { UserMigration, UserMigrationTrigger } from "./userMigration";

type SupportedTriggers =
  | "CustomEmailSender"
  | "CustomMessage"
  | "UserMigration"
  | "PostAuthentication"
  | "PostConfirmation"
  | "PreSignUp"
  | "PreTokenGeneration";

export interface Triggers {
  enabled(trigger: SupportedTriggers): boolean;
  customMessage: CustomMessageTrigger;
  customEmailSender: CustomEmailSenderTrigger;
  postAuthentication: PostAuthenticationTrigger;
  postConfirmation: PostConfirmationTrigger;
  preSignUp: PreSignUpTrigger;
  preTokenGeneration: PreTokenGenerationTrigger;
  userMigration: UserMigrationTrigger;
}

export class TriggersService implements Triggers {
  private readonly lambda: Lambda;

  public readonly customMessage: CustomMessageTrigger;
  public readonly customEmailSender: CustomEmailSenderTrigger;
  public readonly postAuthentication: PostAuthenticationTrigger;
  public readonly postConfirmation: PostConfirmationTrigger;
  public readonly preSignUp: PreSignUpTrigger;
  public readonly preTokenGeneration: PreTokenGenerationTrigger;
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
    this.preTokenGeneration = PreTokenGeneration({ lambda });
    this.userMigration = UserMigration({ clock, lambda, cognitoClient });
  }

  public enabled(trigger: SupportedTriggers): boolean {
    return this.lambda.enabled(trigger);
  }
}
