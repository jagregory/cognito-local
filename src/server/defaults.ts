import { Logger } from "../log";
import {
  CognitoServiceImpl,
  DateClock,
  LambdaService,
  MessagesService,
  TriggersService,
  UserPoolServiceImpl,
} from "../services";
import { ConsoleMessageSender } from "../services/messageDelivery/consoleMessageSender";
import { createDataStore } from "../services/dataStore";
import { MessageDeliveryService } from "../services/messageDelivery/messageDelivery";
import { otp } from "../services/otp";
import { Router } from "../targets/router";
import { loadConfig } from "./config";
import { createServer, Server } from "./server";
import * as AWS from "aws-sdk";

export const createDefaultServer = async (logger: Logger): Promise<Server> => {
  const config = await loadConfig();

  logger.debug("Loaded config:", config);

  const clock = new DateClock();

  const cognitoClient = await CognitoServiceImpl.create(
    ".cognito/db",
    config.UserPoolDefaults,
    clock,
    createDataStore,
    UserPoolServiceImpl.create.bind(UserPoolServiceImpl),
    logger
  );
  const lambdaClient = new AWS.Lambda(config.LambdaClient);
  const lambda = new LambdaService(
    config.TriggerFunctions,
    lambdaClient,
    logger
  );
  const triggers = new TriggersService(clock, cognitoClient, lambda, logger);
  const router = Router(
    {
      clock,
      cognito: cognitoClient,
      messageDelivery: new MessageDeliveryService(
        new ConsoleMessageSender(logger)
      ),
      messages: new MessagesService(triggers),
      otp,
      triggers,
    },
    logger
  );

  return createServer(router, logger, {
    development: !!process.env.COGNITO_LOCAL_DEVMODE,
  });
};
