import { Context } from "../services/context";
import { DataStoreFactory } from "../services/dataStore/factory";
import { FunctionConfig } from "../services/lambda";
import { UserPool } from "../services/userPoolService";
import { TokenConfig } from "../services/tokens";
import mergeWith from "lodash.mergewith";

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

export const DefaultConfig: Config = {
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
    // TODO: this needs to match the actual host/port we started the server on
    IssuerDomain: "http://localhost:9229",
  },
};

export const loadConfig = async (
  ctx: Context,
  dataStoreFactory: DataStoreFactory
): Promise<Config> => {
  ctx.logger.debug("loadConfig");
  const dataStore = await dataStoreFactory.create(ctx, "config", {});

  const config = await dataStore.getRoot<Config>(ctx);

  return mergeWith(
    {},
    DefaultConfig,
    config ?? {},
    function customizer(objValue, srcValue) {
      if (Array.isArray(srcValue)) {
        return srcValue;
      }
    }
  );
};
