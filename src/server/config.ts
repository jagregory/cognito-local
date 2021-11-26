import deepmerge from "deepmerge";
import { createDataStore } from "../services/dataStore";
import { FunctionConfig } from "../services/lambda";
import { UserPool } from "../services/userPoolService";
import { TokenConfig } from "../services/tokens";

export type UserPoolDefaults = Omit<
  UserPool,
  "Id" | "CreationDate" | "LastModifiedDate"
>;

export interface Config {
  LambdaClient: AWS.Lambda.ClientConfiguration;
  TriggerFunctions: FunctionConfig;
  UserPoolDefaults: UserPoolDefaults;
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
