import { advanceTo } from "jest-date-mock";
import jwt from "jsonwebtoken";
import { CodeMismatchError, NotAuthorizedError } from "../errors";
import PublicKey from "../keys/cognitoLocal.public.json";
import { CognitoClient, UserPoolClient } from "../services";
import {
  RespondToAuthChallenge,
  RespondToAuthChallengeTarget,
} from "./respondToAuthChallenge";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

describe("RespondToAuthChallenge target", () => {
  let respondToAuthChallenge: RespondToAuthChallengeTarget;
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

    respondToAuthChallenge = RespondToAuthChallenge({
      cognitoClient: mockCognitoClient,
    });
  });

  it("throws if user doesn't exist", async () => {
    mockUserPoolClient.getUserByUsername.mockResolvedValue(null);

    await expect(
      respondToAuthChallenge({
        ClientId: "clientId",
        ChallengeName: "SMS_MFA",
        ChallengeResponses: {
          USERNAME: "0000-0000",
          SMS_MFA_CODE: "1234",
        },
        Session: "Session",
      })
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  describe("when code matches", () => {
    it("generates tokens", async () => {
      mockUserPoolClient.getUserByUsername.mockResolvedValue({
        Attributes: [
          { Name: "sub", Value: "0000-0000" },
          { Name: "email", Value: "example@example.com" },
        ],
        UserStatus: "CONFIRMED",
        Password: "hunter2",
        Username: "0000-0000",
        Enabled: true,
        UserCreateDate: new Date().getTime(),
        UserLastModifiedDate: new Date().getTime(),
        MFACode: "1234",
      });

      const output = await respondToAuthChallenge({
        ClientId: "clientId",
        ChallengeName: "SMS_MFA",
        ChallengeResponses: {
          USERNAME: "0000-0000",
          SMS_MFA_CODE: "1234",
        },
        Session: "Session",
      });

      expect(output).toBeDefined();
      expect(output.Session).toBe("Session");

      // access token
      expect(output.AuthenticationResult.AccessToken).toBeDefined();
      const decodedAccessToken = jwt.decode(
        output.AuthenticationResult.AccessToken
      );
      expect(decodedAccessToken).toMatchObject({
        client_id: "clientId",
        iss: "http://localhost:9229/test",
        sub: "0000-0000",
        token_use: "access",
        username: "0000-0000",
        event_id: expect.stringMatching(UUID),
        scope: "aws.cognito.signin.user.admin", // TODO: scopes
        auth_time: now.getTime(),
        jti: expect.stringMatching(UUID),
      });
      expect(
        jwt.verify(output.AuthenticationResult.AccessToken, PublicKey.pem, {
          algorithms: ["RS256"],
        })
      ).toBeTruthy();

      // id token
      expect(output.AuthenticationResult.IdToken).toBeDefined();
      const decodedIdToken = jwt.decode(output.AuthenticationResult.IdToken);
      expect(decodedIdToken).toMatchObject({
        aud: "clientId",
        iss: "http://localhost:9229/test",
        sub: "0000-0000",
        token_use: "id",
        "cognito:username": "0000-0000",
        email_verified: true,
        event_id: expect.stringMatching(UUID),
        auth_time: now.getTime(),
        email: "example@example.com",
      });
      expect(
        jwt.verify(output.AuthenticationResult.IdToken, PublicKey.pem, {
          algorithms: ["RS256"],
        })
      ).toBeTruthy();
    });
  });

  describe("when code is incorrect", () => {
    it("throws an error", async () => {
      mockUserPoolClient.getUserByUsername.mockResolvedValue({
        Attributes: [
          { Name: "sub", Value: "0000-0000" },
          { Name: "email", Value: "example@example.com" },
        ],
        UserStatus: "CONFIRMED",
        Password: "hunter2",
        Username: "0000-0000",
        Enabled: true,
        UserCreateDate: new Date().getTime(),
        UserLastModifiedDate: new Date().getTime(),
        MFACode: "1234",
      });

      await expect(
        respondToAuthChallenge({
          ClientId: "clientId",
          ChallengeName: "SMS_MFA",
          ChallengeResponses: {
            USERNAME: "0000-0000",
            SMS_MFA_CODE: "4321",
          },
          Session: "Session",
        })
      ).rejects.toBeInstanceOf(CodeMismatchError);
    });
  });
});
