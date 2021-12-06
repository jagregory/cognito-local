import pino from "pino";
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

export const createDefaultServer = async (
  logger: pino.Logger
): Promise<Server> => {
  const configDirectory = ".cognito";
  const dataDirectory = `${configDirectory}/db`;
  const ctx = {
    logger,
  };

  const config = await loadConfig(ctx, configDirectory, createDataStore);

  logger.debug({ config }, "Loaded config");

  const clock = new DateClock();

  const cognitoClient = await CognitoServiceImpl.create(
    ctx,
    dataDirectory,
    config.UserPoolDefaults,
    clock,
    createDataStore,
    UserPoolServiceImpl.create.bind(UserPoolServiceImpl)
  );
  const lambdaClient = new AWS.Lambda(config.LambdaClient);
  const lambda = new LambdaService(config.TriggerFunctions, lambdaClient);
  const triggers = new TriggersService(clock, cognitoClient, lambda);
  const router = Router({
    clock,
    cognito: cognitoClient,
    config,
    messageDelivery: new MessageDeliveryService(new ConsoleMessageSender()),
    messages: new MessagesService(triggers),
    otp,
    triggers,
  });

  return createServer(router, logger, {
    development: !!process.env.COGNITO_LOCAL_DEVMODE,
  });
};
