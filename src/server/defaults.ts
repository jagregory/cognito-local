import { createCodeDelivery } from "../services";
import { ConsoleCodeSender } from "../services/codeDelivery/consoleCodeSender";
import { otp } from "../services/codeDelivery/otp";
import { createDataStore } from "../services/dataStore";
import { createLambda } from "../services/lambda";
import { createTriggers } from "../services/triggers";
import { createUserPool } from "../services/userPool";
import { Router } from "../targets/router";
import { createServer, Server } from "./server";
import * as AWS from "aws-sdk";

export const createDefaultServer = async (): Promise<Server> => {
  const userPool = await createUserPool(
    {
      UserPoolId: "local",
      UsernameAttributes: ["email"],
    },
    createDataStore
  );
  const lambdaClient = new AWS.Lambda({});
  const lambda = createLambda({}, lambdaClient);
  const triggers = createTriggers({
    lambda,
    userPool,
  });
  const router = Router({
    codeDelivery: createCodeDelivery(ConsoleCodeSender, otp),
    userPool,
    triggers,
  });

  return createServer(router);
};
