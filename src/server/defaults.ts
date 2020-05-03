import { createCodeDelivery } from "../services";
import { ConsoleCodeSender } from "../services/codeDelivery/consoleCodeSender";
import { otp } from "../services/codeDelivery/otp";
import { createDataStore } from "../services/dataStore";
import { createLambda } from "../services/lambda";
import { createTriggers } from "../services/triggers";
import { createCognitoClient } from "../services/cognitoClient";
import { createUserPoolClient } from "../services/userPoolClient";
import { Router } from "../targets/router";
import { loadConfig } from "./config";
import { createServer, Server } from "./server";
import * as AWS from "aws-sdk";

export const createDefaultServer = async (): Promise<Server> => {
  const config = await loadConfig();

  console.log("Loaded config:", config);

  const cognitoClient = await createCognitoClient(
    config.UserPoolDefaults,
    createDataStore,
    createUserPoolClient
  );
  const lambdaClient = new AWS.Lambda(config.LambdaClient);
  const lambda = createLambda(config.TriggerFunctions, lambdaClient);
  const triggers = createTriggers({
    lambda,
    cognitoClient,
  });
  const router = Router({
    codeDelivery: createCodeDelivery(ConsoleCodeSender, otp),
    cognitoClient,
    triggers,
  });

  return createServer(router, {
    development: !!process.env.COGNITO_LOCAL_DEVMODE,
  });
};
