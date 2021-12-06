import jwt from "jsonwebtoken";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockTriggers } from "../__tests__/mockTriggers";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { UUID } from "../__tests__/patterns";
import { TestContext } from "../__tests__/testContext";
import {
  CodeMismatchError,
  InvalidParameterError,
  NotAuthorizedError,
} from "../errors";
import PublicKey from "../keys/cognitoLocal.public.json";
import { DefaultConfig } from "../server/config";
import { Triggers, UserPoolService } from "../services";
import { attributeValue } from "../services/userPoolService";
import {
  RespondToAuthChallenge,
  RespondToAuthChallengeTarget,
} from "./respondToAuthChallenge";
import * as TDB from "../__tests__/testDataBuilder";

const currentDate = new Date();

describe("RespondToAuthChallenge target", () => {
  let respondToAuthChallenge: RespondToAuthChallengeTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let mockTriggers: jest.Mocked<Triggers>;
  let clock: ClockFake;

  beforeEach(() => {
    clock = new ClockFake(currentDate);
    mockUserPoolService = newMockUserPoolService();
    mockTriggers = newMockTriggers();
    respondToAuthChallenge = RespondToAuthChallenge({
      clock,
      cognito: newMockCognitoService(mockUserPoolService),
      config: {
        ...DefaultConfig,
        TokenConfig: {
          IssuerDomain: "http://issuer-domain",
        },
      },
      triggers: mockTriggers,
    });
  });

  it("throws if user doesn't exist", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      respondToAuthChallenge(TestContext, {
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
      respondToAuthChallenge(TestContext, {
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
      respondToAuthChallenge(TestContext, {
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
      respondToAuthChallenge(TestContext, {
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

    beforeEach(() => {
      mockUserPoolService.getUserByUsername.mockResolvedValue(user);
    });

    describe("when code matches", () => {
      it("updates the user and removes the MFACode", async () => {
        const newDate = clock.advanceBy(1200);

        await respondToAuthChallenge(TestContext, {
          ClientId: "clientId",
          ChallengeName: "SMS_MFA",
          ChallengeResponses: {
            USERNAME: user.Username,
            SMS_MFA_CODE: "1234",
          },
          Session: "Session",
        });

        expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
          ...user,
          MFACode: undefined,
          UserLastModifiedDate: newDate,
        });
      });

      it("generates tokens", async () => {
        const output = await respondToAuthChallenge(TestContext, {
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
          iss: "http://issuer-domain/test",
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
          iss: "http://issuer-domain/test",
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

      describe("when Post Authentication trigger is enabled", () => {
        it("does invokes the trigger", async () => {
          mockTriggers.enabled.mockImplementation(
            (trigger) => trigger === "PostAuthentication"
          );

          await respondToAuthChallenge(TestContext, {
            ClientId: "clientId",
            ChallengeName: "SMS_MFA",
            ClientMetadata: {
              client: "metadata",
            },
            ChallengeResponses: {
              USERNAME: user.Username,
              SMS_MFA_CODE: "1234",
            },
            Session: "Session",
          });

          expect(mockTriggers.postAuthentication).toHaveBeenCalledWith(
            TestContext,
            {
              clientId: "clientId",
              clientMetadata: {
                client: "metadata",
              },
              source: "PostAuthentication_Authentication",
              userAttributes: user.Attributes,
              username: user.Username,
              userPoolId: "test",
            }
          );
        });
      });
    });

    describe("when code is incorrect", () => {
      it("throws an error", async () => {
        mockUserPoolService.getUserByUsername.mockResolvedValue(user);

        await expect(
          respondToAuthChallenge(TestContext, {
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

    beforeEach(() => {
      mockUserPoolService.getUserByUsername.mockResolvedValue(user);
    });

    it("throws if NEW_PASSWORD missing", async () => {
      await expect(
        respondToAuthChallenge(TestContext, {
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
      const newDate = clock.advanceBy(1200);

      await respondToAuthChallenge(TestContext, {
        ClientId: "clientId",
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        ChallengeResponses: {
          USERNAME: user.Username,
          NEW_PASSWORD: "foo",
        },
        Session: "Session",
      });

      expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
        ...user,
        Password: "foo",
        UserLastModifiedDate: newDate,
        UserStatus: "CONFIRMED",
      });
    });

    it("generates tokens", async () => {
      const output = await respondToAuthChallenge(TestContext, {
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
        iss: "http://issuer-domain/test",
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
        iss: "http://issuer-domain/test",
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

    describe("when Post Authentication trigger is enabled", () => {
      it("does invokes the trigger", async () => {
        mockTriggers.enabled.mockImplementation(
          (trigger) => trigger === "PostAuthentication"
        );

        await respondToAuthChallenge(TestContext, {
          ClientId: "clientId",
          ChallengeName: "NEW_PASSWORD_REQUIRED",
          ChallengeResponses: {
            USERNAME: user.Username,
            NEW_PASSWORD: "foo",
          },
          Session: "Session",
        });

        expect(mockTriggers.postAuthentication).toHaveBeenCalledWith(
          TestContext,
          {
            clientId: "clientId",
            source: "PostAuthentication_Authentication",
            userAttributes: user.Attributes,
            username: user.Username,
            userPoolId: "test",
          }
        );
      });
    });
  });
});
