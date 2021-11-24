import { advanceTo } from "jest-date-mock";
import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import { MockLogger } from "../__tests__/mockLogger";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import { CognitoClient, UserPoolClient } from "../services";
import { GetUser, GetUserTarget } from "./getUser";

describe("GetUser target", () => {
  let getUser: GetUserTarget;
  let mockCognitoClient: jest.Mocked<CognitoClient>;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;
  let now: Date;

  beforeEach(() => {
    now = new Date(2020, 1, 2, 3, 4, 5);
    advanceTo(now);

    mockUserPoolClient = {
      config: {
        Id: "test",
      },
      createAppClient: jest.fn(),
      getUserByUsername: jest.fn(),
      listUsers: jest.fn(),
      saveUser: jest.fn(),
    };
    mockCognitoClient = {
      getAppClient: jest.fn(),
      getUserPool: jest.fn().mockResolvedValue(mockUserPoolClient),
      getUserPoolForClientId: jest.fn().mockResolvedValue(mockUserPoolClient),
    };

    getUser = GetUser(
      {
        cognitoClient: mockCognitoClient,
      },
      MockLogger
    );
  });

  it("parses token get user by sub", async () => {
    mockUserPoolClient.getUserByUsername.mockResolvedValue({
      Attributes: [],
      UserStatus: "CONFIRMED",
      Password: "hunter2",
      Username: "0000-0000",
      Enabled: true,
      UserCreateDate: new Date().getTime(),
      UserLastModifiedDate: new Date().getTime(),
      ConfirmationCode: "1234",
    });

    const output = await getUser({
      AccessToken: jwt.sign(
        {
          sub: "0000-0000",
          event_id: "0",
          token_use: "access",
          scope: "aws.cognito.signin.user.admin",
          auth_time: new Date(),
          jti: uuid.v4(),
          client_id: "test",
          username: "0000-0000",
        },
        PrivateKey.pem,
        {
          algorithm: "RS256",
          issuer: `http://localhost:9229/test`,
          expiresIn: "24h",
          keyid: "CognitoLocal",
        }
      ),
    });

    expect(output).toBeDefined();
    expect(output).toEqual({
      UserAttributes: [],
      Username: "0000-0000",
    });
  });

  it("throws if token isn't valid", async () => {
    await expect(
      getUser({
        AccessToken: "blah",
      })
    ).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("throws if user doesn't exist", async () => {
    mockUserPoolClient.getUserByUsername.mockResolvedValue(null);

    await expect(
      getUser({
        AccessToken: jwt.sign(
          {
            sub: "0000-0000",
            event_id: "0",
            token_use: "access",
            scope: "aws.cognito.signin.user.admin",
            auth_time: new Date(),
            jti: uuid.v4(),
            client_id: "test",
            username: "0000-0000",
          },
          PrivateKey.pem,
          {
            algorithm: "RS256",
            issuer: `http://localhost:9229/test`,
            expiresIn: "24h",
            keyid: "CognitoLocal",
          }
        ),
      })
    ).rejects.toEqual(new UserNotFoundError());
  });
});
