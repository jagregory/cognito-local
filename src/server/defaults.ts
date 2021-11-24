import { Logger } from "../log";
import {
  CognitoClientService,
  LambdaService,
  MessagesService,
  TriggersService,
  UserPoolClientService,
} from "../services";
import { DateClock } from "../services/clock";
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

  const cognitoClient = await CognitoClientService.create(
    config.UserPoolDefaults,
    clock,
    createDataStore,
    UserPoolClientService.create.bind(UserPoolClientService),
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
      cognitoClient,
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
