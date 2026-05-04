import type { Clock } from "../clock";
import type { CognitoService } from "../cognitoService";
import type { CryptoService } from "../crypto";
import type { Lambda } from "../lambda";
import {
  CreateAuthChallenge,
  type CreateAuthChallengeTrigger,
} from "./createAuthChallenge";
import {
  CustomEmailSender,
  type CustomEmailSenderTrigger,
} from "./customEmailSender";
import { CustomMessage, type CustomMessageTrigger } from "./customMessage";
import {
  DefineAuthChallenge,
  type DefineAuthChallengeTrigger,
} from "./defineAuthChallenge";
import {
  PostAuthentication,
  type PostAuthenticationTrigger,
} from "./postAuthentication";
import {
  PostConfirmation,
  type PostConfirmationTrigger,
} from "./postConfirmation";
import { PreSignUp, type PreSignUpTrigger } from "./preSignUp";
import {
  PreTokenGeneration,
  type PreTokenGenerationTrigger,
} from "./preTokenGeneration";
import { UserMigration, type UserMigrationTrigger } from "./userMigration";
import {
  VerifyAuthChallengeResponse,
  type VerifyAuthChallengeResponseTrigger,
} from "./verifyAuthChallengeResponse";

type SupportedTriggers =
  | "CreateAuthChallenge"
  | "CustomEmailSender"
  | "CustomMessage"
  | "DefineAuthChallenge"
  | "PostAuthentication"
  | "PostConfirmation"
  | "PreSignUp"
  | "PreTokenGeneration"
  | "UserMigration"
  | "VerifyAuthChallengeResponse";

export interface Triggers {
  enabled(trigger: SupportedTriggers): boolean;
  createAuthChallenge: CreateAuthChallengeTrigger;
  customMessage: CustomMessageTrigger;
  customEmailSender: CustomEmailSenderTrigger;
  defineAuthChallenge: DefineAuthChallengeTrigger;
  postAuthentication: PostAuthenticationTrigger;
  postConfirmation: PostConfirmationTrigger;
  preSignUp: PreSignUpTrigger;
  preTokenGeneration: PreTokenGenerationTrigger;
  userMigration: UserMigrationTrigger;
  verifyAuthChallengeResponse: VerifyAuthChallengeResponseTrigger;
}

export class TriggersService implements Triggers {
  private readonly lambda: Lambda;

  public readonly createAuthChallenge: CreateAuthChallengeTrigger;
  public readonly customMessage: CustomMessageTrigger;
  public readonly customEmailSender: CustomEmailSenderTrigger;
  public readonly defineAuthChallenge: DefineAuthChallengeTrigger;
  public readonly postAuthentication: PostAuthenticationTrigger;
  public readonly postConfirmation: PostConfirmationTrigger;
  public readonly preSignUp: PreSignUpTrigger;
  public readonly preTokenGeneration: PreTokenGenerationTrigger;
  public readonly userMigration: UserMigrationTrigger;
  public readonly verifyAuthChallengeResponse: VerifyAuthChallengeResponseTrigger;

  public constructor(
    clock: Clock,
    cognitoClient: CognitoService,
    lambda: Lambda,
    crypto: CryptoService,
  ) {
    this.lambda = lambda;

    this.createAuthChallenge = CreateAuthChallenge({ lambda });
    this.customEmailSender = CustomEmailSender({ lambda, crypto });
    this.customMessage = CustomMessage({ lambda });
    this.defineAuthChallenge = DefineAuthChallenge({ lambda });
    this.postAuthentication = PostAuthentication({ lambda });
    this.postConfirmation = PostConfirmation({ lambda });
    this.preSignUp = PreSignUp({ lambda });
    this.preTokenGeneration = PreTokenGeneration({ lambda });
    this.userMigration = UserMigration({ clock, lambda, cognitoClient });
    this.verifyAuthChallengeResponse = VerifyAuthChallengeResponse({ lambda });
  }

  public enabled(trigger: SupportedTriggers): boolean {
    return this.lambda.enabled(trigger);
  }
}
