import { Logger } from "../../log";
import { CognitoClient } from "../cognitoClient";
import { Lambda } from "../lambda";
import { CustomMessage, CustomMessageTrigger } from "./customMessage";
import { PostConfirmation, PostConfirmationTrigger } from "./postConfirmation";
import { UserMigration, UserMigrationTrigger } from "./userMigration";

export interface Triggers {
  enabled(
    trigger: "CustomMessage" | "UserMigration" | "PostConfirmation"
  ): boolean;
  customMessage: CustomMessageTrigger;
  userMigration: UserMigrationTrigger;
  postConfirmation: PostConfirmationTrigger;
}

export class TriggersService {
  private readonly lambda: Lambda;

  public readonly customMessage: CustomMessageTrigger;
  public readonly userMigration: UserMigrationTrigger;
  public readonly postConfirmation: PostConfirmationTrigger;

  public constructor(
    lambda: Lambda,
    cognitoClient: CognitoClient,
    logger: Logger
  ) {
    this.customMessage = CustomMessage({ lambda, cognitoClient }, logger);
    this.userMigration = UserMigration({ lambda, cognitoClient });
    this.postConfirmation = PostConfirmation({ lambda, cognitoClient }, logger);
    this.lambda = lambda;
  }

  public enabled(
    trigger: "CustomMessage" | "UserMigration" | "PostConfirmation"
  ): boolean {
    return this.lambda.enabled(trigger);
  }
}
