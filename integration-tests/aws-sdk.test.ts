import * as AWS from "aws-sdk";
import fs from "fs";
import * as http from "http";
import { promisify } from "util";
import { createServer } from "../src/server";
import { CodeDelivery } from "../src/services";
import { createCognitoClient } from "../src/services/cognitoClient";
import { createDataStore, CreateDataStore } from "../src/services/dataStore";
import { Lambda } from "../src/services/lambda";
import { createTriggers } from "../src/services/triggers";
import { createUserPoolClient } from "../src/services/userPoolClient";
import { Router } from "../src/targets/router";

const mkdtemp = promisify(fs.mkdtemp);
const rmdir = promisify(fs.rmdir);

describe("AWS SDK usage", () => {
  let path: string;
  let tmpCreateDataStore: CreateDataStore;
  let httpServer: http.Server;
  let Cognito: AWS.CognitoIdentityServiceProvider;

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

    Cognito = new AWS.CognitoIdentityServiceProvider({
      credentials: {
        accessKeyId: "local",
        secretAccessKey: "local",
      },
      region: "local",
      endpoint: `http://${url}`,
    });
  });

  afterEach((done) => {
    httpServer.close(() => {
      rmdir(path, {
        recursive: true,
      }).then(done, done);
    });
  });

  describe("createUserPoolClient", () => {
    it("can create a new app client", async () => {
      const result = await Cognito.createUserPoolClient({
        ClientName: "test",
        UserPoolId: "test",
      }).promise();

      expect(result).toEqual({
        UserPoolClient: {
          AllowedOAuthFlowsUserPoolClient: false,
          ClientId: expect.stringMatching(/^[a-z0-9]{25}$/),
          ClientName: "test",
          CreationDate: expect.any(Date),
          LastModifiedDate: expect.any(Date),
          RefreshTokenValidity: 30,
          UserPoolId: "test",
        },
      });
    });
  });
});
