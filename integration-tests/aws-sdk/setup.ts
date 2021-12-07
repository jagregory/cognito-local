import * as AWS from "aws-sdk";
import fs from "fs";
import http from "http";
import type { Logger } from "pino";
import { promisify } from "util";
import { createServer } from "../../src";
import { MockLogger } from "../../src/__tests__/mockLogger";
import { DefaultConfig } from "../../src/server/config";
import {
  Clock,
  DateClock,
  MessagesService,
  TriggersService,
} from "../../src/services";
import { CognitoServiceFactoryImpl } from "../../src/services/cognitoService";
import { StormDBDataStoreFactory } from "../../src/services/dataStore/stormDb";
import { otp } from "../../src/services/otp";
import { UserPoolServiceFactoryImpl } from "../../src/services/userPoolService";
import { Router } from "../../src/targets/router";

const mkdtemp = promisify(fs.mkdtemp);
const rmdir = promisify(fs.rmdir);

export const withCognitoSdk =
  (
    fn: (cognito: () => AWS.CognitoIdentityServiceProvider) => void,
    {
      logger = MockLogger as any,
      clock = new DateClock(),
    }: { logger?: Logger; clock?: Clock } = {}
  ) =>
  () => {
    let dataDirectory: string;
    let httpServer: http.Server;
    let cognitoSdk: AWS.CognitoIdentityServiceProvider;

    beforeEach(async () => {
      dataDirectory = await mkdtemp("/tmp/cognito-local:");
      const ctx = { logger };

      const dataStoreFactory = new StormDBDataStoreFactory(dataDirectory);
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
        messageDelivery: {
          deliver: jest.fn(),
        },
        messages: new MessagesService(triggers),
        otp,
        triggers,
      });
      const server = createServer(router, ctx.logger);
      httpServer = await server.start({
        port: 0,
      });

      const address = httpServer.address()!;
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

    fn(() => cognitoSdk);

    afterEach((done) => {
      httpServer.close(() => {
        rmdir(dataDirectory, {
          recursive: true,
        }).then(done, done);
      });
    });
  };
