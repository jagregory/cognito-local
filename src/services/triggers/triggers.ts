import { Clock } from "../clock";
import { CognitoService } from "../cognitoService";
import { Lambda } from "../lambda";
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
  | "CustomMessage"
  | "UserMigration"
  | "PostAuthentication"
  | "PostConfirmation"
  | "PreSignUp"
  | "PreTokenGeneration";

export interface Triggers {
  enabled(trigger: SupportedTriggers): boolean;
  customMessage: CustomMessageTrigger;
  postAuthentication: PostAuthenticationTrigger;
  postConfirmation: PostConfirmationTrigger;
  preSignUp: PreSignUpTrigger;
  preTokenGeneration: PreTokenGenerationTrigger;
  userMigration: UserMigrationTrigger;
}

export class TriggersService implements Triggers {
  private readonly lambda: Lambda;

  public readonly customMessage: CustomMessageTrigger;
  public readonly postAuthentication: PostAuthenticationTrigger;
  public readonly postConfirmation: PostConfirmationTrigger;
  public readonly preSignUp: PreSignUpTrigger;
  public readonly preTokenGeneration: PreTokenGenerationTrigger;
  public readonly userMigration: UserMigrationTrigger;

  public constructor(
    clock: Clock,
    cognitoClient: CognitoService,
    lambda: Lambda
  ) {
    this.lambda = lambda;

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
