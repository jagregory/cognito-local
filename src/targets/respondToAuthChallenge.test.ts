import jwt from "jsonwebtoken";
import { ClockFake } from "../__tests__/clockFake";
import { MockUserPoolClient } from "../__tests__/mockUserPoolClient";
import { UUID } from "../__tests__/patterns";
import {
  CodeMismatchError,
  InvalidParameterError,
  NotAuthorizedError,
} from "../errors";
import PublicKey from "../keys/cognitoLocal.public.json";
import { CognitoClient } from "../services";
import {
  RespondToAuthChallenge,
  RespondToAuthChallengeTarget,
} from "./respondToAuthChallenge";
import { User } from "../services/userPoolClient";

const currentDate = new Date();

describe("RespondToAuthChallenge target", () => {
  let respondToAuthChallenge: RespondToAuthChallengeTarget;
  let mockCognitoClient: jest.Mocked<CognitoClient>;
  let clock: ClockFake;

  beforeEach(() => {
    mockCognitoClient = {
      getAppClient: jest.fn(),
      getUserPool: jest.fn().mockResolvedValue(MockUserPoolClient),
      getUserPoolForClientId: jest.fn().mockResolvedValue(MockUserPoolClient),
    };

    clock = new ClockFake(currentDate);
    respondToAuthChallenge = RespondToAuthChallenge({
      cognitoClient: mockCognitoClient,
      clock,
    });
  });

  it("throws if user doesn't exist", async () => {
    MockUserPoolClient.getUserByUsername.mockResolvedValue(null);

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

  it("throws if ChallengeResponses missing", async () => {
    await expect(
      respondToAuthChallenge({
        ClientId: "clientId",
        ChallengeName: "SMS_MFA",
      })
    ).rejects.toEqual(
      new InvalidParameterError(
        "Missing required parameter challenge responses"
      )
    );
  });

  it("throws if ChallengeResponses.USERNAME is missing", async () => {
    await expect(
      respondToAuthChallenge({
        ClientId: "clientId",
        ChallengeName: "SMS_MFA",
        ChallengeResponses: {},
      })
    ).rejects.toEqual(
      new InvalidParameterError("Missing required parameter USERNAME")
    );
  });

  it("throws if Session is missing", async () => {
    // we don't actually do anything with the session right now, but we still want to
    // replicate Cognito's behaviour if you don't provide it
    await expect(
      respondToAuthChallenge({
        ClientId: "clientId",
        ChallengeName: "SMS_MFA",
        ChallengeResponses: {
          USERNAME: "abc",
        },
      })
    ).rejects.toEqual(
      new InvalidParameterError("Missing required parameter Session")
    );
  });

  describe("ChallengeName=SMS_MFA", () => {
    const user: User = {
      Attributes: [
        { Name: "sub", Value: "0000-0000" },
        { Name: "email", Value: "example@example.com" },
      ],
      UserStatus: "CONFIRMED",
      Password: "hunter2",
      Username: "0000-0000",
      Enabled: true,
      UserCreateDate: currentDate.getTime(),
      UserLastModifiedDate: currentDate.getTime(),
      MFACode: "1234",
    };
    describe("when code matches", () => {
      it("updates the user and removes the MFACode", async () => {
        MockUserPoolClient.getUserByUsername.mockResolvedValue(user);

        const newDate = clock.advanceBy(1200);

        await respondToAuthChallenge({
          ClientId: "clientId",
          ChallengeName: "SMS_MFA",
          ChallengeResponses: {
            USERNAME: "0000-0000",
            SMS_MFA_CODE: "1234",
          },
          Session: "Session",
        });

        expect(MockUserPoolClient.saveUser).toHaveBeenCalledWith({
          ...user,
          MFACode: undefined,
          UserLastModifiedDate: newDate.getTime(),
        });
      });

      it("generates tokens", async () => {
        MockUserPoolClient.getUserByUsername.mockResolvedValue(user);

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

        // access token
        expect(output.AuthenticationResult?.AccessToken).toBeDefined();
        const decodedAccessToken = jwt.decode(
          output.AuthenticationResult?.AccessToken ?? ""
        );
        expect(decodedAccessToken).toMatchObject({
          client_id: "clientId",
          iss: "http://localhost:9229/test",
          sub: "0000-0000",
          token_use: "access",
          username: "0000-0000",
          event_id: expect.stringMatching(UUID),
          scope: "aws.cognito.signin.user.admin", // TODO: scopes
          auth_time: Math.floor(clock.get().getTime() / 1000),
          jti: expect.stringMatching(UUID),
        });
        expect(
          jwt.verify(
            output.AuthenticationResult?.AccessToken ?? "",
            PublicKey.pem,
            {
              algorithms: ["RS256"],
            }
          )
        ).toBeTruthy();

        // id token
        expect(output.AuthenticationResult?.IdToken).toBeDefined();
        const decodedIdToken = jwt.decode(
          output.AuthenticationResult?.IdToken ?? ""
        );
        expect(decodedIdToken).toMatchObject({
          aud: "clientId",
          iss: "http://localhost:9229/test",
          sub: "0000-0000",
          token_use: "id",
          "cognito:username": "0000-0000",
          email_verified: true,
          event_id: expect.stringMatching(UUID),
          auth_time: Math.floor(clock.get().getTime() / 1000),
          email: "example@example.com",
        });
        expect(
          jwt.verify(
            output.AuthenticationResult?.IdToken ?? "",
            PublicKey.pem,
            {
              algorithms: ["RS256"],
            }
          )
        ).toBeTruthy();
      });
    });

    describe("when code is incorrect", () => {
      it("throws an error", async () => {
        MockUserPoolClient.getUserByUsername.mockResolvedValue(user);

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

  describe("ChallengeName=NEW_PASSWORD_REQUIRED", () => {
    const user: User = {
      Attributes: [
        { Name: "sub", Value: "0000-0000" },
        { Name: "email", Value: "example@example.com" },
      ],
      UserStatus: "FORCE_CHANGE_PASSWORD",
      Password: "hunter2",
      Username: "0000-0000",
      Enabled: true,
      UserCreateDate: currentDate.getTime(),
      UserLastModifiedDate: currentDate.getTime(),
    };

    it("throws if NEW_PASSWORD missing", async () => {
      MockUserPoolClient.getUserByUsername.mockResolvedValue(user);

      await expect(
        respondToAuthChallenge({
          ClientId: "clientId",
          ChallengeName: "NEW_PASSWORD_REQUIRED",
          ChallengeResponses: {
            USERNAME: "0000-0000",
          },
          Session: "session",
        })
      ).rejects.toEqual(
        new InvalidParameterError("Missing required parameter NEW_PASSWORD")
      );
    });

    it("updates the user's password and status", async () => {
      MockUserPoolClient.getUserByUsername.mockResolvedValue(user);

      const newDate = clock.advanceBy(1200);

      await respondToAuthChallenge({
        ClientId: "clientId",
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        ChallengeResponses: {
          USERNAME: "0000-0000",
          NEW_PASSWORD: "foo",
        },
        Session: "Session",
      });

      expect(MockUserPoolClient.saveUser).toHaveBeenCalledWith({
        ...user,
        Password: "foo",
        UserLastModifiedDate: newDate.getTime(),
        UserStatus: "CONFIRMED",
      });
    });

    it("generates tokens", async () => {
      MockUserPoolClient.getUserByUsername.mockResolvedValue(user);

      const output = await respondToAuthChallenge({
        ClientId: "clientId",
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        ChallengeResponses: {
          USERNAME: "0000-0000",
          NEW_PASSWORD: "foo",
        },
        Session: "Session",
      });

      expect(output).toBeDefined();

      // access token
      expect(output.AuthenticationResult?.AccessToken).toBeDefined();
      const decodedAccessToken = jwt.decode(
        output.AuthenticationResult?.AccessToken ?? ""
      );
      expect(decodedAccessToken).toMatchObject({
        client_id: "clientId",
        iss: "http://localhost:9229/test",
        sub: "0000-0000",
        token_use: "access",
        username: "0000-0000",
        event_id: expect.stringMatching(UUID),
        scope: "aws.cognito.signin.user.admin", // TODO: scopes
        auth_time: Math.floor(clock.get().getTime() / 1000),
        jti: expect.stringMatching(UUID),
      });
      expect(
        jwt.verify(
          output.AuthenticationResult?.AccessToken ?? "",
          PublicKey.pem,
          {
            algorithms: ["RS256"],
          }
        )
      ).toBeTruthy();

      // id token
      expect(output.AuthenticationResult?.IdToken).toBeDefined();
      const decodedIdToken = jwt.decode(
        output.AuthenticationResult?.IdToken ?? ""
      );
      expect(decodedIdToken).toMatchObject({
        aud: "clientId",
        iss: "http://localhost:9229/test",
        sub: "0000-0000",
        token_use: "id",
        "cognito:username": "0000-0000",
        email_verified: true,
        event_id: expect.stringMatching(UUID),
        auth_time: Math.floor(clock.get().getTime() / 1000),
        email: "example@example.com",
      });
      expect(
        jwt.verify(output.AuthenticationResult?.IdToken ?? "", PublicKey.pem, {
          algorithms: ["RS256"],
        })
      ).toBeTruthy();
    });
  });
});
