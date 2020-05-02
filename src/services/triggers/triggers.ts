import { Services, CognitoClient } from "../index";
import { Lambda } from "../lambda";
import { PostConfirmation, PostConfirmationTrigger } from "./postConfirmation";
import { UserMigration, UserMigrationTrigger } from "./userMigration";

export interface Triggers {
  enabled(trigger: "UserMigration" | "PostConfirmation"): boolean;
  userMigration: UserMigrationTrigger;
  postConfirmation: PostConfirmationTrigger;
}

export const createTriggers = (services: {
  lambda: Lambda;
  cognitoClient: CognitoClient;
}): Triggers => ({
  enabled: (trigger: "UserMigration") => services.lambda.enabled(trigger),
  userMigration: UserMigration(services),
  postConfirmation: PostConfirmation(services),
});
