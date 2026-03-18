import type { LambdaConfigType } from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Clock } from "../clock";
import type { CognitoService } from "../cognitoService";
import type { CryptoService } from "../crypto";
import type { Lambda } from "../lambda";
import {
  CustomEmailSender,
  type CustomEmailSenderTrigger,
} from "./customEmailSender";
import { CustomMessage, type CustomMessageTrigger } from "./customMessage";
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
  forPool(poolConfig: LambdaConfigType | undefined): Triggers;
  customMessage: CustomMessageTrigger;
  customEmailSender: CustomEmailSenderTrigger;
  postAuthentication: PostAuthenticationTrigger;
  postConfirmation: PostConfirmationTrigger;
  preSignUp: PreSignUpTrigger;
  preTokenGeneration: PreTokenGenerationTrigger;
  userMigration: UserMigrationTrigger;
}

export class TriggersService implements Triggers {
  private readonly clock: Clock;
  private readonly cognitoClient: CognitoService;
  private readonly lambda: Lambda;
  private readonly crypto: CryptoService;

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
    crypto: CryptoService,
  ) {
    this.clock = clock;
    this.cognitoClient = cognitoClient;
    this.lambda = lambda;
    this.crypto = crypto;

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

  public forPool(poolConfig: LambdaConfigType | undefined): Triggers {
    return new TriggersService(
      this.clock,
      this.cognitoClient,
      this.lambda.forPool(poolConfig),
      this.crypto,
    );
  }
}
