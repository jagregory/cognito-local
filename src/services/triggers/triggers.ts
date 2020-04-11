import { Services, UserPool } from "../index";
import { Lambda } from "../lambda";
import { UserMigration, UserMigrationTrigger } from "./userMigration";

export interface Triggers {
  enabled(trigger: "UserMigration"): boolean;
  userMigration: UserMigrationTrigger;
}

export const createTriggers = (services: {
  lambda: Lambda;
  userPool: UserPool;
}): Triggers => ({
  enabled: (trigger: "UserMigration") => services.lambda.enabled(trigger),
  userMigration: UserMigration(services),
});
