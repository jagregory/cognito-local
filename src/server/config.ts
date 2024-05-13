import { Context } from "../services/context";
import { DataStoreFactory } from "../services/dataStore/factory";
import { FunctionConfig } from "../services/lambda";
import { UserPool } from "../services/userPoolService";
import { TokenConfig } from "../services/tokenGenerator";
import mergeWith from "lodash.mergewith";
import { KMSConfig } from "../services/crypto";

export type UserPoolDefaults = Omit<
  UserPool,
  "Id" | "CreationDate" | "LastModifiedDate"
>;

export interface Config {
  LambdaClient: AWS.Lambda.ClientConfiguration;
  TriggerFunctions: FunctionConfig;
  UserPoolDefaults: UserPoolDefaults;
  KMSConfig?: AWS.KMS.ClientConfiguration & KMSConfig;
  TokenConfig: TokenConfig;
}

const hostname = process.env.ISSUER_HOST ?? "localhost";
const port = process.env.PORT ?? "9229";

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
    IssuerDomain: `http://${hostname}:${port}`,
  },
  KMSConfig: {
    credentials: {
      accessKeyId: "local",
      secretAccessKey: "local",
    },
    region: "local",
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
