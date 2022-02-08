import * as AWS from "aws-sdk";
import fs from "fs";
import http from "http";
import type { Logger } from "pino";
import { createServer } from "../../src";
import { MockLogger } from "../../src/mocks/MockLogger";
import { MockMessageDelivery } from "../../src/mocks/MockMessageDelivery";
import { DefaultConfig } from "../../src/server/config";
import {
  Clock,
  DateClock,
  MessagesService,
  TriggersService,
} from "../../src/services";
import { CognitoServiceFactoryImpl } from "../../src/services/cognitoService";
import { NoOpCache } from "../../src/services/dataStore/cache";
import { DataStoreFactory } from "../../src/services/dataStore/factory";
import { StormDBDataStoreFactory } from "../../src/services/dataStore/stormDb";
import { otp } from "../../src/services/otp";
import { JwtTokenGenerator } from "../../src/services/tokenGenerator";
import { UserPoolServiceFactoryImpl } from "../../src/services/userPoolService";
import { Router } from "../../src/targets/router";

export const withCognitoSdk =
  (
    fn: (
      cognito: () => AWS.CognitoIdentityServiceProvider,
      dataStoreFactory: () => DataStoreFactory
    ) => void,
    {
      logger = MockLogger as any,
      clock = new DateClock(),
    }: { logger?: Logger; clock?: Clock } = {}
  ) =>
  () => {
    let dataDirectory: string;
    let httpServer: http.Server;
    let cognitoSdk: AWS.CognitoIdentityServiceProvider;
    let dataStoreFactory: DataStoreFactory;

    beforeEach(async () => {
      dataDirectory = fs.mkdtempSync("/tmp/cognito-local:");
      const ctx = { logger };

      dataStoreFactory = new StormDBDataStoreFactory(
        dataDirectory,
        new NoOpCache()
      );
      const cognitoServiceFactory = new CognitoServiceFactoryImpl(
        dataDirectory,
        clock,
        dataStoreFactory,
        new UserPoolServiceFactoryImpl(clock, dataStoreFactory)
      );
      const cognitoClient = await cognitoServiceFactory.create(ctx, {});
      const triggers = new TriggersService(clock, cognitoClient, {
        enabled: jest.fn().mockReturnValue(false),
        invoke: jest.fn(),
      });
      const router = Router({
        clock,
        cognito: cognitoClient,
        config: DefaultConfig,
        messages: new MessagesService(triggers, MockMessageDelivery()),
        otp,
        triggers,
        tokenGenerator: new JwtTokenGenerator(
          clock,
          triggers,
          DefaultConfig.TokenConfig
        ),
      });
      const server = createServer(router, ctx.logger);
      httpServer = await server.start({
        port: 0,
      });

      const address = httpServer.address();
      if (!address) {
        throw new Error("HttpServer has no address");
      }
      const url =
        typeof address === "string"
          ? address
          : `${address.address}:${address.port}`;

      cognitoSdk = new AWS.CognitoIdentityServiceProvider({
        credentials: {
          accessKeyId: "local",
          secretAccessKey: "local",
        },
        region: "local",
        endpoint: `http://${url}`,
      });
    });

    fn(
      () => cognitoSdk,
      () => dataStoreFactory
    );

    afterEach((done) => {
      httpServer.close(() => {
        fs.rmSync(dataDirectory, { recursive: true });
        done();
      });
    });
  };
