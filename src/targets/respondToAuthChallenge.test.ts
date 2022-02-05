import { MockClock } from "../mocks/MockClock";
import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockTokenGenerator } from "../mocks/MockTokenGenerator";
import { MockTriggers } from "../mocks/MockTriggers";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";
import {
  CodeMismatchError,
  InvalidParameterError,
  NotAuthorizedError,
} from "../errors";
import { Triggers, UserPoolService } from "../services";
import { TokenGenerator } from "../services/tokenGenerator";
import {
  RespondToAuthChallenge,
  RespondToAuthChallengeTarget,
} from "./respondToAuthChallenge";
import { MockUser } from "../mocks/MockUser";

const currentDate = new Date();

describe("RespondToAuthChallenge target", () => {
  let respondToAuthChallenge: RespondToAuthChallengeTarget;
  let mockTokenGenerator: jest.Mocked<TokenGenerator>;
  let mockTriggers: jest.Mocked<Triggers>;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let clock: MockClock;

  beforeEach(() => {
    clock = new MockClock(currentDate);
    mockTokenGenerator = MockTokenGenerator();
    mockTriggers = MockTriggers();
    mockUserPoolService = MockUserPoolService();
    respondToAuthChallenge = RespondToAuthChallenge({
      clock,
      cognito: MockCognitoService(mockUserPoolService),
      tokenGenerator: mockTokenGenerator,
      triggers: mockTriggers,
    });
  });

  it("throws if user doesn't exist", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      respondToAuthChallenge(MockContext, {
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
      respondToAuthChallenge(MockContext, {
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
      respondToAuthChallenge(MockContext, {
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
      respondToAuthChallenge(MockContext, {
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
    const user = MockUser({
      MFACode: "1234",
    });

    beforeEach(() => {
      mockUserPoolService.getUserByUsername.mockResolvedValue(user);
    });

    describe("when code matches", () => {
      it("updates the user and removes the MFACode", async () => {
        const newDate = clock.advanceBy(1200);

        await respondToAuthChallenge(MockContext, {
          ClientId: "clientId",
          ChallengeName: "SMS_MFA",
          ChallengeResponses: {
            USERNAME: user.Username,
            SMS_MFA_CODE: "1234",
          },
          Session: "Session",
        });

        expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(MockContext, {
          ...user,
          MFACode: undefined,
          UserLastModifiedDate: newDate,
        });
      });

      it("generates tokens", async () => {
        mockTokenGenerator.generate.mockResolvedValue({
          AccessToken: "access",
          IdToken: "id",
          RefreshToken: "refresh",
        });

        const output = await respondToAuthChallenge(MockContext, {
          ClientId: "clientId",
          ChallengeName: "SMS_MFA",
          ChallengeResponses: {
            USERNAME: user.Username,
            SMS_MFA_CODE: "1234",
          },
          Session: "Session",
          ClientMetadata: {
            client: "metadata",
          },
        });

        expect(output).toBeDefined();

        expect(output.AuthenticationResult?.AccessToken).toEqual("access");
        expect(output.AuthenticationResult?.IdToken).toEqual("id");
        expect(output.AuthenticationResult?.RefreshToken).toEqual("refresh");

        expect(mockTokenGenerator.generate).toHaveBeenCalledWith(
          MockContext,
          user,
          "clientId",
          "test",
          {
            client: "metadata",
          },
          "Authentication"
        );
      });

      describe("when Post Authentication trigger is enabled", () => {
        it("does invokes the trigger", async () => {
          mockTriggers.enabled.mockImplementation(
            (trigger) => trigger === "PostAuthentication"
          );

          await respondToAuthChallenge(MockContext, {
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
            MockContext,
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
          respondToAuthChallenge(MockContext, {
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
    const user = MockUser();

    beforeEach(() => {
      mockUserPoolService.getUserByUsername.mockResolvedValue(user);
    });

    it("throws if NEW_PASSWORD missing", async () => {
      await expect(
        respondToAuthChallenge(MockContext, {
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

      await respondToAuthChallenge(MockContext, {
        ClientId: "clientId",
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        ChallengeResponses: {
          USERNAME: user.Username,
          NEW_PASSWORD: "foo",
        },
        Session: "Session",
      });

      expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(MockContext, {
        ...user,
        Password: "foo",
        UserLastModifiedDate: newDate,
        UserStatus: "CONFIRMED",
      });
    });

    it("generates tokens", async () => {
      mockTokenGenerator.generate.mockResolvedValue({
        AccessToken: "access",
        IdToken: "id",
        RefreshToken: "refresh",
      });

      const output = await respondToAuthChallenge(MockContext, {
        ClientId: "clientId",
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        ChallengeResponses: {
          USERNAME: user.Username,
          NEW_PASSWORD: "foo",
        },
        Session: "Session",
        ClientMetadata: {
          client: "metadata",
        },
      });

      expect(output).toBeDefined();

      expect(output.AuthenticationResult?.AccessToken).toEqual("access");
      expect(output.AuthenticationResult?.IdToken).toEqual("id");
      expect(output.AuthenticationResult?.RefreshToken).toEqual("refresh");

      expect(mockTokenGenerator.generate).toHaveBeenCalledWith(
        MockContext,
        user,
        "clientId",
        "test",
        { client: "metadata" },
        "Authentication"
      );
    });

    describe("when Post Authentication trigger is enabled", () => {
      it("does invokes the trigger", async () => {
        mockTriggers.enabled.mockImplementation(
          (trigger) => trigger === "PostAuthentication"
        );

        await respondToAuthChallenge(MockContext, {
          ClientId: "clientId",
          ChallengeName: "NEW_PASSWORD_REQUIRED",
          ChallengeResponses: {
            USERNAME: user.Username,
            NEW_PASSWORD: "foo",
          },
          Session: "Session",
        });

        expect(mockTriggers.postAuthentication).toHaveBeenCalledWith(
          MockContext,
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
