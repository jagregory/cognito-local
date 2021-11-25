import deepmerge from "deepmerge";
import { createDataStore } from "../services/dataStore";
import { FunctionConfig } from "../services/lambda";
import { UserPool } from "../services/userPoolService";
import { TokenConfig } from "../services/tokens";

export interface Config {
  LambdaClient: AWS.Lambda.ClientConfiguration;
  TriggerFunctions: FunctionConfig;
  UserPoolDefaults: UserPool;
  TokenConfig: TokenConfig;
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
  TokenConfig: {
    IssuerDomain: "http://localhost:9229",
  },
};

export const loadConfig = async (): Promise<Config> => {
  const dataStore = await createDataStore("config", defaults, ".cognito");

  const config = await dataStore.getRoot<Config>();

  return deepmerge(defaults, config ?? {});
};
