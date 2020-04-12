import deepmerge from "deepmerge";
import { createDataStore } from "../services/dataStore";
import { FunctionConfig } from "../services/lambda";
import { UserPoolOptions } from "../services/userPool";

export interface Config {
  LambdaClient: AWS.Lambda.ClientConfiguration;
  TriggerFunctions: FunctionConfig;
  UserPoolDefaults: UserPoolOptions;
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
    UserPoolId: "local",
    UsernameAttributes: ["email"],
  },
};

export const loadConfig = async (): Promise<Config> => {
  const dataStore = await createDataStore("config", defaults, ".cognito");

  const config = await dataStore.get<Config>();

  return deepmerge(defaults, config ?? {});
};
