import * as AWS from "aws-sdk";
import fs from "fs";
import http from "http";
import { promisify } from "util";
import { createServer } from "../../src/server";
import { CodeDelivery } from "../../src/services";
import { createCognitoClient } from "../../src/services/cognitoClient";
import { createDataStore, CreateDataStore } from "../../src/services/dataStore";
import { Lambda } from "../../src/services/lambda";
import { createTriggers } from "../../src/services/triggers";
import { createUserPoolClient } from "../../src/services/userPoolClient";
import { Router } from "../../src/targets/router";

const mkdtemp = promisify(fs.mkdtemp);
const rmdir = promisify(fs.rmdir);

export const withCognitoSdk = (
  fn: (cognito: () => AWS.CognitoIdentityServiceProvider) => void
) => () => {
  let path: string;
  let tmpCreateDataStore: CreateDataStore;
  let httpServer: http.Server;
  let cognitoSdk: AWS.CognitoIdentityServiceProvider;

  beforeEach(async () => {
    path = await mkdtemp("/tmp/cognito-local:");
    tmpCreateDataStore = (id, defaults) => createDataStore(id, defaults, path);
    const cognitoClient = await createCognitoClient(
      {
        Id: "integration-test",
        UsernameAttributes: [],
      },
      tmpCreateDataStore,
      createUserPoolClient
    );
    const mockLambda: jest.Mocked<Lambda> = {
      enabled: jest.fn().mockReturnValue(false),
      invoke: jest.fn(),
    };
    const triggers = createTriggers({
      lambda: mockLambda,
      cognitoClient,
    });
    const mockCodeDelivery: jest.MockedFunction<CodeDelivery> = jest.fn();

    const router = Router({
      codeDelivery: mockCodeDelivery,
      cognitoClient,
      triggers,
    });
    const server = createServer(router);
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
