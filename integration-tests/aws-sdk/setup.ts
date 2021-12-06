import * as AWS from "aws-sdk";
import fs from "fs";
import http from "http";
import { promisify } from "util";
import { createServer } from "../../src";
import { MockLogger } from "../../src/__tests__/mockLogger";
import type { Logger } from "pino";
import { DefaultConfig } from "../../src/server/config";
import {
  Clock,
  CognitoServiceImpl,
  DateClock,
  Lambda,
  MessageDelivery,
  MessagesService,
  TriggersService,
  UserPoolServiceImpl,
} from "../../src/services";
import { createDataStore } from "../../src/services/dataStore";
import { otp } from "../../src/services/otp";
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

      const cognitoClient = await CognitoServiceImpl.create(
        ctx,
        dataDirectory,
        {},
        clock,
        createDataStore,
        UserPoolServiceImpl.create.bind(UserPoolServiceImpl)
      );
      const mockLambda: jest.Mocked<Lambda> = {
        enabled: jest.fn().mockReturnValue(false),
        invoke: jest.fn(),
      };
      const triggers = new TriggersService(clock, cognitoClient, mockLambda);
      const mockCodeDelivery: jest.Mocked<MessageDelivery> = {
        deliver: jest.fn(),
      };

      const router = Router({
        clock,
        cognito: cognitoClient,
        config: DefaultConfig,
        messageDelivery: mockCodeDelivery,
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
