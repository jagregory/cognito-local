import * as AWS from "aws-sdk";
import type pino from "pino";
import {
  DateClock,
  LambdaService,
  MessagesService,
  TriggersService,
} from "../services";
import { CognitoServiceFactoryImpl } from "../services/cognitoService";
import { CryptoService } from "../services/crypto";
import { StormDBDataStoreFactory } from "../services/dataStore/stormDb";
import { ConsoleMessageSender } from "../services/messageDelivery/consoleMessageSender";
import { MessageDeliveryService } from "../services/messageDelivery/messageDelivery";
import { otp } from "../services/otp";
import { JwtTokenGenerator } from "../services/tokenGenerator";
import { UserPoolServiceFactoryImpl } from "../services/userPoolService";
import { loadConfig } from "./config";
import { Router } from "./Router";
import { createServer, type Server } from "./server";

export const createDefaultServer = async (
  logger: pino.Logger,
): Promise<Server> => {
  const configDirectory = ".cognito";
  const dataDirectory = `${configDirectory}/db`;
  const ctx = {
    logger,
  };

  const config = await loadConfig(
    ctx,
    // the config gets a separate factory because it's stored in a different directory
    new StormDBDataStoreFactory(configDirectory),
  );

  logger.debug({ config }, "Loaded config");

  const clock = new DateClock();

  const dataStoreFactory = new StormDBDataStoreFactory(dataDirectory);

  const cognitoServiceFactory = new CognitoServiceFactoryImpl(
    dataDirectory,
    dataStoreFactory,
    new UserPoolServiceFactoryImpl(clock, dataStoreFactory),
  );
  const cognitoClient = await cognitoServiceFactory.create(
    ctx,
    config.UserPoolDefaults,
  );
  const triggers = new TriggersService(
    clock,
    cognitoClient,
    new LambdaService(
      config.TriggerFunctions,
      new AWS.Lambda(config.LambdaClient),
    ),
    new CryptoService(config.KMSConfig),
  );

  return createServer(
    Router({
      clock,
      cognito: cognitoClient,
      config,
      messages: new MessagesService(
        triggers,
        new MessageDeliveryService(new ConsoleMessageSender()),
      ),
      otp,
      tokenGenerator: new JwtTokenGenerator(
        clock,
        triggers,
        config.TokenConfig,
      ),
      triggers,
    }),
    logger,
    config.ServerConfig,
  );
};
