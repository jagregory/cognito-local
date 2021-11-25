import { Logger } from "../../log";
import { Clock } from "../clock";
import { CognitoService } from "../cognitoService";
import { Lambda } from "../lambda";
import { CustomMessage, CustomMessageTrigger } from "./customMessage";
import {
  PostAuthentication,
  PostAuthenticationTrigger,
} from "./postAuthentication";
import { PostConfirmation, PostConfirmationTrigger } from "./postConfirmation";
import { UserMigration, UserMigrationTrigger } from "./userMigration";

type SupportedTriggers =
  | "CustomMessage"
  | "UserMigration"
  | "PostAuthentication"
  | "PostConfirmation";

export interface Triggers {
  enabled(trigger: SupportedTriggers): boolean;
  customMessage: CustomMessageTrigger;
  userMigration: UserMigrationTrigger;
  postAuthentication: PostAuthenticationTrigger;
  postConfirmation: PostConfirmationTrigger;
}

export class TriggersService {
  private readonly lambda: Lambda;

  public readonly customMessage: CustomMessageTrigger;
  public readonly postAuthentication: PostAuthenticationTrigger;
  public readonly postConfirmation: PostConfirmationTrigger;
  public readonly userMigration: UserMigrationTrigger;

  public constructor(
    clock: Clock,
    cognitoClient: CognitoService,
    lambda: Lambda,
    logger: Logger
  ) {
    this.customMessage = CustomMessage({ lambda, cognitoClient }, logger);
    this.postAuthentication = PostAuthentication({ lambda }, logger);
    this.postConfirmation = PostConfirmation({ lambda, cognitoClient }, logger);
    this.userMigration = UserMigration({ clock, lambda, cognitoClient });
    this.lambda = lambda;
  }

  public enabled(trigger: SupportedTriggers): boolean {
    return this.lambda.enabled(trigger);
  }
}
