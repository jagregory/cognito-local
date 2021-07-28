import deepmerge from "deepmerge";
import { createDataStore } from "../services/dataStore";
import { FunctionConfig } from "../services/lambda";
import { UserPool } from "../services/userPoolClient";

export interface Config {
  LambdaClient: AWS.Lambda.ClientConfiguration;
  TriggerFunctions: FunctionConfig;
  UserPoolDefaults: UserPool;
}

const defaults: Config = {
  LambdaClient: {
    credentials: {
      accessKeyId: "local",
      secretAccessKey: "local",
    },
    region: "local",
  },
  TriggerFunctions: {},
  UserPoolDefaults: {
    Id: "local",
    UsernameAttributes: ["email"],
  },
};

export const loadConfig = async (): Promise<Config> => {
  const dataStore = await createDataStore("config", defaults, ".cognito");

  const config = await dataStore.getRoot<Config>();

  return deepmerge(defaults, config ?? {});
};
