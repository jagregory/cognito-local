import jwt from "jsonwebtoken";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoClient } from "../__tests__/mockCognitoClient";
import { newMockUserPoolClient } from "../__tests__/mockUserPoolClient";
import { UUID } from "../__tests__/patterns";
import {
  CodeMismatchError,
  InvalidParameterError,
  NotAuthorizedError,
} from "../errors";
import PublicKey from "../keys/cognitoLocal.public.json";
import { UserPoolClient } from "../services";
import { attributeValue } from "../services/userPoolClient";
import {
  RespondToAuthChallenge,
  RespondToAuthChallengeTarget,
} from "./respondToAuthChallenge";
import * as TDB from "../__tests__/testDataBuilder";

const currentDate = new Date();

describe("RespondToAuthChallenge target", () => {
  let respondToAuthChallenge: RespondToAuthChallengeTarget;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;
  let clock: ClockFake;

  beforeEach(() => {
    clock = new ClockFake(currentDate);
    mockUserPoolClient = newMockUserPoolClient();
    respondToAuthChallenge = RespondToAuthChallenge({
      cognitoClient: newMockCognitoClient(mockUserPoolClient),
      clock,
    });
  });

  it("throws if user doesn't exist", async () => {
    mockUserPoolClient.getUserByUsername.mockResolvedValue(null);

    await expect(
      respondToAuthChallenge({
        ClientId: "clientId",
        ChallengeName: "SMS_MFA",
        ChallengeResponses: {
          USERNAME: "username",
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
    const user = TDB.user({
      MFACode: "1234",
    });

    describe("when code matches", () => {
      it("updates the user and removes the MFACode", async () => {
        mockUserPoolClient.getUserByUsername.mockResolvedValue(user);

        const newDate = clock.advanceBy(1200);

        await respondToAuthChallenge({
          ClientId: "clientId",
          ChallengeName: "SMS_MFA",
          ChallengeResponses: {
            USERNAME: user.Username,
            SMS_MFA_CODE: "1234",
          },
          Session: "Session",
        });

        expect(mockUserPoolClient.saveUser).toHaveBeenCalledWith({
          ...user,
          MFACode: undefined,
          UserLastModifiedDate: newDate.getTime(),
        });
      });

      it("generates tokens", async () => {
        mockUserPoolClient.getUserByUsername.mockResolvedValue(user);

        const output = await respondToAuthChallenge({
          ClientId: "clientId",
          ChallengeName: "SMS_MFA",
          ChallengeResponses: {
            USERNAME: user.Username,
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
          sub: attributeValue("sub", user.Attributes),
          token_use: "access",
          username: user.Username,
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
          sub: attributeValue("sub", user.Attributes),
          token_use: "id",
          "cognito:username": user.Username,
          email_verified: true,
          event_id: expect.stringMatching(UUID),
          auth_time: Math.floor(clock.get().getTime() / 1000),
          email: attributeValue("email", user.Attributes),
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
        mockUserPoolClient.getUserByUsername.mockResolvedValue(user);

        await expect(
          respondToAuthChallenge({
            ClientId: "clientId",
            ChallengeName: "SMS_MFA",
            ChallengeResponses: {
              USERNAME: user.Username,
              SMS_MFA_CODE: "4321",
            },
            Session: "Session",
          })
        ).rejects.toBeInstanceOf(CodeMismatchError);
      });
    });
  });

  describe("ChallengeName=NEW_PASSWORD_REQUIRED", () => {
    const user = TDB.user();

    it("throws if NEW_PASSWORD missing", async () => {
      mockUserPoolClient.getUserByUsername.mockResolvedValue(user);

      await expect(
        respondToAuthChallenge({
          ClientId: "clientId",
          ChallengeName: "NEW_PASSWORD_REQUIRED",
          ChallengeResponses: {
            USERNAME: user.Username,
          },
          Session: "session",
        })
      ).rejects.toEqual(
        new InvalidParameterError("Missing required parameter NEW_PASSWORD")
      );
    });

    it("updates the user's password and status", async () => {
      mockUserPoolClient.getUserByUsername.mockResolvedValue(user);

      const newDate = clock.advanceBy(1200);

      await respondToAuthChallenge({
        ClientId: "clientId",
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        ChallengeResponses: {
          USERNAME: user.Username,
          NEW_PASSWORD: "foo",
        },
        Session: "Session",
      });

      expect(mockUserPoolClient.saveUser).toHaveBeenCalledWith({
        ...user,
        Password: "foo",
        UserLastModifiedDate: newDate.getTime(),
        UserStatus: "CONFIRMED",
      });
    });

    it("generates tokens", async () => {
      mockUserPoolClient.getUserByUsername.mockResolvedValue(user);

      const output = await respondToAuthChallenge({
        ClientId: "clientId",
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        ChallengeResponses: {
          USERNAME: user.Username,
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
        sub: attributeValue("sub", user.Attributes),
        token_use: "access",
        username: user.Username,
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
        sub: attributeValue("sub", user.Attributes),
        token_use: "id",
        "cognito:username": user.Username,
        email_verified: true,
        event_id: expect.stringMatching(UUID),
        auth_time: Math.floor(clock.get().getTime() / 1000),
        email: attributeValue("email", user.Attributes),
      });
      expect(
        jwt.verify(output.AuthenticationResult?.IdToken ?? "", PublicKey.pem, {
          algorithms: ["RS256"],
        })
      ).toBeTruthy();
    });
  });
});
