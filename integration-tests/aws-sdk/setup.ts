import * as AWS from "aws-sdk";
import fs from "fs";
import http from "http";
import { promisify } from "util";
import { createServer } from "../../src";
import { MockLogger } from "../../src/__tests__/mockLogger";
import { Logger } from "../../src/log";
import {
  CognitoClientService,
  MessageDelivery,
  MessagesService,
  Lambda,
  UserPoolClientService,
  TriggersService,
} from "../../src/services";
import { createDataStore, CreateDataStore } from "../../src/services/dataStore";
import { otp } from "../../src/services/otp";
import { Router } from "../../src/targets/router";

const mkdtemp = promisify(fs.mkdtemp);
const rmdir = promisify(fs.rmdir);

export const withCognitoSdk = (
  fn: (cognito: () => AWS.CognitoIdentityServiceProvider) => void,
  logger: Logger = MockLogger
) => () => {
  let path: string;
  let tmpCreateDataStore: CreateDataStore;
  let httpServer: http.Server;
  let cognitoSdk: AWS.CognitoIdentityServiceProvider;

  beforeEach(async () => {
    path = await mkdtemp("/tmp/cognito-local:");
    tmpCreateDataStore = (id, defaults) => createDataStore(id, defaults, path);

    const cognitoClient = await CognitoClientService.create(
      {
        Id: "integration-test",
        UsernameAttributes: [],
      },
      tmpCreateDataStore,
      UserPoolClientService.create.bind(null),
      logger
    );
    const mockLambda: jest.Mocked<Lambda> = {
      enabled: jest.fn().mockReturnValue(false),
      invoke: jest.fn(),
    };
    const triggers = new TriggersService(mockLambda, cognitoClient, logger);
    const mockCodeDelivery: jest.Mocked<MessageDelivery> = {
      deliver: jest.fn(),
    };

    const router = Router(
      {
        cognitoClient,
        messageDelivery: mockCodeDelivery,
        messages: new MessagesService(triggers),
        otp,
        triggers,
      },
      logger
    );
    const server = createServer(router, logger);
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
      rmdir(path, {
        recursive: true,
      }).then(done, done);
    });
  });
};
