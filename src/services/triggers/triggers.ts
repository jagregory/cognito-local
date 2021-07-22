import { Logger } from "../../log";
import { CognitoClient } from "../cognitoClient";
import { Lambda } from "../lambda";
import { PostConfirmation, PostConfirmationTrigger } from "./postConfirmation";
import { UserMigration, UserMigrationTrigger } from "./userMigration";

export interface Triggers {
  enabled(trigger: "UserMigration" | "PostConfirmation"): boolean;
  userMigration: UserMigrationTrigger;
  postConfirmation: PostConfirmationTrigger;
}

export class TriggersService {
  private readonly lambda: Lambda;

  public readonly userMigration: UserMigrationTrigger;
  public readonly postConfirmation: PostConfirmationTrigger;

  public constructor(
    lambda: Lambda,
    cognitoClient: CognitoClient,
    logger: Logger
  ) {
    this.userMigration = UserMigration({ lambda, cognitoClient });
    this.postConfirmation = PostConfirmation({ lambda, cognitoClient }, logger);
    this.lambda = lambda;
  }

  public enabled(trigger: "UserMigration" | "PostConfirmation"): boolean {
    return this.lambda.enabled(trigger);
  }
}
