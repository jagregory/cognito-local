import {
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  type MockedObject,
  vi,
} from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockMessages } from "../__tests__/mockMessages";
import { newMockSessionService } from "../__tests__/mockSessionService";
import { newMockTokenGenerator } from "../__tests__/mockTokenGenerator";
import { newMockTriggers } from "../__tests__/mockTriggers";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import {
  CodeMismatchError,
  InvalidParameterError,
  NotAuthorizedError,
} from "../errors";
import type {
  Messages,
  SessionService,
  Triggers,
  UserPoolService,
} from "../services";
import type { TokenGenerator } from "../services/tokenGenerator";
import { generateSecret, generate as genTotp } from "../services/totp";
import {
  RespondToAuthChallenge,
  type RespondToAuthChallengeTarget,
} from "./respondToAuthChallenge";

const currentDate = new Date();

describe("RespondToAuthChallenge target", () => {
  let respondToAuthChallenge: RespondToAuthChallengeTarget;
  let mockTokenGenerator: MockedObject<TokenGenerator>;
  let mockTriggers: MockedObject<Triggers>;
  let mockUserPoolService: MockedObject<UserPoolService>;
  let mockMessages: MockedObject<Messages>;
  let mockOtp: Mock<() => string>;
  let mockSessions: MockedObject<SessionService>;
  let clock: ClockFake;
  const userPoolClient = TDB.appClient();

  beforeEach(() => {
    clock = new ClockFake(currentDate);
    mockTokenGenerator = newMockTokenGenerator();
    mockTokenGenerator.generate.mockResolvedValue({
      AccessToken: "access",
      IdToken: "id",
      RefreshToken: "refresh",
    });
    mockTriggers = newMockTriggers();
    mockUserPoolService = newMockUserPoolService({
      Id: userPoolClient.UserPoolId,
    });
    mockMessages = newMockMessages();
    mockOtp = vi.fn().mockReturnValue("123456");
    mockSessions = newMockSessionService();
    mockSessions.create.mockReturnValue("setup-session");

    const mockCognitoService = newMockCognitoService(mockUserPoolService);
    mockCognitoService.getAppClient.mockResolvedValue(userPoolClient);

    respondToAuthChallenge = RespondToAuthChallenge({
      clock,
      cognito: mockCognitoService,
      messages: mockMessages,
      otp: mockOtp,
      sessions: mockSessions,
      tokenGenerator: mockTokenGenerator,
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
          SMS_MFA_CODE: "123456",
        },
        Session: "Session",
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws if ChallengeResponses missing", async () => {
    await expect(
      respondToAuthChallenge(TestContext, {
        ClientId: "clientId",
        ChallengeName: "SMS_MFA",
      }),
    ).rejects.toEqual(
      new InvalidParameterError(
        "Missing required parameter challenge responses",
      ),
    );
  });

  it("throws if ChallengeResponses.USERNAME is missing", async () => {
    await expect(
      respondToAuthChallenge(TestContext, {
        ClientId: "clientId",
        ChallengeName: "SMS_MFA",
        ChallengeResponses: {},
      }),
    ).rejects.toEqual(
      new InvalidParameterError("Missing required parameter USERNAME"),
    );
  });

  it("throws if Session is missing", async () => {
    // we don't actually do anything with the session right now, but we still want to
    // replicate Cognito's behaviour if you don't provide it
    await expect(
      respondToAuthChallenge(TestContext, {
        ClientId: userPoolClient.ClientId,
        ChallengeName: "SMS_MFA",
        ChallengeResponses: {
          USERNAME: "abc",
        },
      }),
    ).rejects.toEqual(
      new InvalidParameterError("Missing required parameter Session"),
    );
  });

  describe("ChallengeName=MFA_SETUP", () => {
    const sessionFor = (username: string) => ({
      clientId: userPoolClient.ClientId,
      expiresAt: Date.now() + 60_000,
      purpose: "MFA_SETUP" as const,
      userPoolId: userPoolClient.UserPoolId,
      username,
    });

    it("consumes the session and issues tokens after TOTP verification", async () => {
      const user = TDB.user({
        SoftwareTokenMfaConfiguration: {
          Secret: generateSecret(),
          Verified: true,
        },
        UserMFASettingList: ["SOFTWARE_TOKEN_MFA"],
      });
      mockUserPoolService.getUserByUsername.mockResolvedValue(user);
      mockUserPoolService.listUserGroupMembership.mockResolvedValue([]);
      mockSessions.consume.mockReturnValue(sessionFor(user.Username));

      const result = await respondToAuthChallenge(TestContext, {
        ClientId: userPoolClient.ClientId,
        ChallengeName: "MFA_SETUP",
        ChallengeResponses: { USERNAME: user.Username },
        Session: "verified-session",
      });

      expect(mockSessions.consume).toHaveBeenCalledWith("verified-session");
      expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
        ...user,
        UserLastModifiedDate: currentDate,
      });
      expect(result.AuthenticationResult?.AccessToken).toEqual("access");
    });

    it("rejects replaying a consumed session", async () => {
      const user = TDB.user({
        SoftwareTokenMfaConfiguration: {
          Secret: generateSecret(),
          Verified: true,
        },
      });
      mockUserPoolService.getUserByUsername.mockResolvedValue(user);
      mockUserPoolService.listUserGroupMembership.mockResolvedValue([]);
      mockSessions.consume
        .mockReturnValueOnce(sessionFor(user.Username))
        .mockReturnValueOnce(null);

      const request = {
        ClientId: userPoolClient.ClientId,
        ChallengeName: "MFA_SETUP" as const,
        ChallengeResponses: { USERNAME: user.Username },
        Session: "one-time-session",
      };

      await respondToAuthChallenge(TestContext, request);
      await expect(
        respondToAuthChallenge(TestContext, request),
      ).rejects.toEqual(
        new NotAuthorizedError("Invalid session for the user."),
      );
    });

    it("rejects an unverified software token", async () => {
      const user = TDB.user({
        SoftwareTokenMfaConfiguration: {
          Secret: generateSecret(),
          Verified: false,
        },
      });
      mockUserPoolService.getUserByUsername.mockResolvedValue(user);
      mockSessions.consume.mockReturnValue(sessionFor(user.Username));

      await expect(
        respondToAuthChallenge(TestContext, {
          ClientId: userPoolClient.ClientId,
          ChallengeName: "MFA_SETUP",
          ChallengeResponses: { USERNAME: user.Username },
          Session: "unverified-session",
        }),
      ).rejects.toEqual(
        new InvalidParameterError("User has not verified software token MFA"),
      );
    });

    it("rejects a session bound to a different user", async () => {
      const user = TDB.user({
        SoftwareTokenMfaConfiguration: {
          Secret: generateSecret(),
          Verified: true,
        },
      });
      mockUserPoolService.getUserByUsername.mockResolvedValue(user);
      mockSessions.consume.mockReturnValue(sessionFor("another-user"));

      await expect(
        respondToAuthChallenge(TestContext, {
          ClientId: userPoolClient.ClientId,
          ChallengeName: "MFA_SETUP",
          ChallengeResponses: { USERNAME: user.Username },
          Session: "mismatched-session",
        }),
      ).rejects.toEqual(
        new NotAuthorizedError("Invalid session for the user."),
      );
    });

    it("rejects a session bound to a different client", async () => {
      const user = TDB.user({
        SoftwareTokenMfaConfiguration: {
          Secret: generateSecret(),
          Verified: true,
        },
      });
      mockUserPoolService.getUserByUsername.mockResolvedValue(user);
      mockSessions.consume.mockReturnValue({
        ...sessionFor(user.Username),
        clientId: "another-client",
      });

      await expect(
        respondToAuthChallenge(TestContext, {
          ClientId: userPoolClient.ClientId,
          ChallengeName: "MFA_SETUP",
          ChallengeResponses: { USERNAME: user.Username },
          Session: "mismatched-session",
        }),
      ).rejects.toEqual(
        new NotAuthorizedError("Invalid session for the user."),
      );
    });
  });

  describe("ChallengeName=PASSWORD_VERIFIER", () => {
    it("applies forced MFA enrollment after the SRP password challenge", async () => {
      const user = TDB.user();
      mockUserPoolService.options.MfaConfiguration = "ON";
      mockUserPoolService.options.SoftwareTokenMfaConfiguration = {
        Enabled: true,
      };
      mockUserPoolService.getUserByUsername.mockResolvedValue(user);
      const secretBlock = Buffer.from(
        JSON.stringify({
          username: user.Username,
          password: user.Password,
          userPoolId: userPoolClient.UserPoolId,
        }),
      ).toString("base64");

      const result = await respondToAuthChallenge(TestContext, {
        ClientId: userPoolClient.ClientId,
        ChallengeName: "PASSWORD_VERIFIER",
        ChallengeResponses: {
          PASSWORD_CLAIM_SECRET_BLOCK: secretBlock,
          TIMESTAMP: new Date().toISOString(),
          USERNAME: user.Username,
        },
      });

      expect(result).toEqual({
        ChallengeName: "MFA_SETUP",
        ChallengeParameters: {
          USER_ID_FOR_SRP: user.Username,
          MFAS_CAN_SETUP: JSON.stringify(["SOFTWARE_TOKEN_MFA"]),
        },
        Session: "setup-session",
      });
      expect(mockTokenGenerator.generate).not.toHaveBeenCalled();
    });
  });

  describe("ChallengeName=SMS_MFA", () => {
    const user = TDB.user({
      MFACode: "123456",
    });

    beforeEach(() => {
      mockUserPoolService.getUserByUsername.mockResolvedValue(user);
    });

    describe("when code matches", () => {
      it("updates the user and removes the MFACode", async () => {
        const newDate = clock.advanceBy(1200);

        await respondToAuthChallenge(TestContext, {
          ClientId: userPoolClient.ClientId,
          ChallengeName: "SMS_MFA",
          ChallengeResponses: {
            USERNAME: user.Username,
            SMS_MFA_CODE: "123456",
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
        mockTokenGenerator.generate.mockResolvedValue({
          AccessToken: "access",
          IdToken: "id",
          RefreshToken: "refresh",
        });
        mockUserPoolService.listUserGroupMembership.mockResolvedValue([]);

        const output = await respondToAuthChallenge(TestContext, {
          ClientId: userPoolClient.ClientId,
          ChallengeName: "SMS_MFA",
          ChallengeResponses: {
            USERNAME: user.Username,
            SMS_MFA_CODE: "123456",
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
          TestContext,
          user,
          [],
          userPoolClient,
          {
            client: "metadata",
          },
          "Authentication",
        );
      });

      describe("when Post Authentication trigger is enabled", () => {
        it("does invokes the trigger", async () => {
          mockTriggers.enabled.mockImplementation(
            (trigger) => trigger === "PostAuthentication",
          );

          await respondToAuthChallenge(TestContext, {
            ClientId: userPoolClient.ClientId,
            ChallengeName: "SMS_MFA",
            ClientMetadata: {
              client: "metadata",
            },
            ChallengeResponses: {
              USERNAME: user.Username,
              SMS_MFA_CODE: "123456",
            },
            Session: "Session",
          });

          expect(mockTriggers.postAuthentication).toHaveBeenCalledWith(
            TestContext,
            {
              clientId: userPoolClient.ClientId,
              clientMetadata: {
                client: "metadata",
              },
              source: "PostAuthentication_Authentication",
              userAttributes: user.Attributes,
              username: user.Username,
              userPoolId: userPoolClient.UserPoolId,
            },
          );
        });
      });
    });

    describe("when code is incorrect", () => {
      it("throws an error", async () => {
        mockUserPoolService.getUserByUsername.mockResolvedValue(user);

        await expect(
          respondToAuthChallenge(TestContext, {
            ClientId: userPoolClient.ClientId,
            ChallengeName: "SMS_MFA",
            ChallengeResponses: {
              USERNAME: user.Username,
              SMS_MFA_CODE: "4321",
            },
            Session: "Session",
          }),
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
          ClientId: userPoolClient.ClientId,
          ChallengeName: "NEW_PASSWORD_REQUIRED",
          ChallengeResponses: {
            USERNAME: user.Username,
          },
          Session: "session",
        }),
      ).rejects.toEqual(
        new InvalidParameterError("Missing required parameter NEW_PASSWORD"),
      );
    });

    it("updates the user's password and status", async () => {
      const newDate = clock.advanceBy(1200);

      await respondToAuthChallenge(TestContext, {
        ClientId: userPoolClient.ClientId,
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
      mockTokenGenerator.generate.mockResolvedValue({
        AccessToken: "access",
        IdToken: "id",
        RefreshToken: "refresh",
      });
      mockUserPoolService.listUserGroupMembership.mockResolvedValue([]);

      const output = await respondToAuthChallenge(TestContext, {
        ClientId: userPoolClient.ClientId,
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
        TestContext,
        user,
        [],
        userPoolClient,
        { client: "metadata" },
        "Authentication",
      );
    });

    describe("when Post Authentication trigger is enabled", () => {
      it("does invokes the trigger", async () => {
        mockTriggers.enabled.mockImplementation(
          (trigger) => trigger === "PostAuthentication",
        );

        await respondToAuthChallenge(TestContext, {
          ClientId: userPoolClient.ClientId,
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
            clientId: userPoolClient.ClientId,
            source: "PostAuthentication_Authentication",
            userAttributes: user.Attributes,
            username: user.Username,
            userPoolId: userPoolClient.UserPoolId,
          },
        );
      });
    });
  });

  describe("SOFTWARE_TOKEN_MFA challenge", () => {
    const secret = generateSecret();

    it("issues tokens when code matches verified secret", async () => {
      const user = TDB.user({
        UserMFASettingList: ["SOFTWARE_TOKEN_MFA"],
        SoftwareTokenMfaConfiguration: { Secret: secret, Verified: true },
      });
      mockUserPoolService.getUserByUsername.mockResolvedValue(user);
      mockUserPoolService.listUserGroupMembership.mockResolvedValue([]);
      mockTokenGenerator.generate.mockResolvedValue({
        AccessToken: "a",
        IdToken: "i",
        RefreshToken: "r",
      });
      const result = await respondToAuthChallenge(TestContext, {
        ClientId: userPoolClient.ClientId,
        ChallengeName: "SOFTWARE_TOKEN_MFA",
        Session: "sess",
        ChallengeResponses: {
          USERNAME: user.Username,
          SOFTWARE_TOKEN_MFA_CODE: genTotp(secret),
        },
      });

      expect(result.AuthenticationResult?.AccessToken).toEqual("a");
    });

    it("rejects an incorrect code", async () => {
      const user = TDB.user({
        SoftwareTokenMfaConfiguration: { Secret: secret, Verified: true },
      });
      mockUserPoolService.getUserByUsername.mockResolvedValue(user);

      await expect(
        respondToAuthChallenge(TestContext, {
          ClientId: userPoolClient.ClientId,
          ChallengeName: "SOFTWARE_TOKEN_MFA",
          Session: "sess",
          ChallengeResponses: {
            USERNAME: user.Username,
            SOFTWARE_TOKEN_MFA_CODE: "000000",
          },
        }),
      ).rejects.toBeInstanceOf(CodeMismatchError);
    });
  });

  describe("SELECT_MFA_TYPE challenge", () => {
    it("routes ANSWER=SOFTWARE_TOKEN_MFA to a TOTP challenge", async () => {
      const user = TDB.user({
        UserMFASettingList: ["SMS_MFA", "SOFTWARE_TOKEN_MFA"],
        SoftwareTokenMfaConfiguration: {
          Secret: "S",
          Verified: true,
          FriendlyDeviceName: "Phone",
        },
      });
      mockUserPoolService.getUserByUsername.mockResolvedValue(user);

      const result = await respondToAuthChallenge(TestContext, {
        ClientId: userPoolClient.ClientId,
        ChallengeName: "SELECT_MFA_TYPE",
        Session: "sess",
        ChallengeResponses: {
          USERNAME: user.Username,
          ANSWER: "SOFTWARE_TOKEN_MFA",
        },
      });

      expect(result.ChallengeName).toEqual("SOFTWARE_TOKEN_MFA");
      expect(result.ChallengeParameters).toMatchObject({
        USER_ID_FOR_SRP: user.Username,
        FRIENDLY_DEVICE_NAME: "Phone",
      });
    });

    it("routes ANSWER=SMS_MFA to SMS challenge and sends code", async () => {
      const user = TDB.user({
        Attributes: [{ Name: "phone_number", Value: "0411000111" }],
        MFAOptions: [{ DeliveryMedium: "SMS", AttributeName: "phone_number" }],
        UserMFASettingList: ["SMS_MFA", "SOFTWARE_TOKEN_MFA"],
      });
      mockUserPoolService.getUserByUsername.mockResolvedValue(user);

      const result = await respondToAuthChallenge(TestContext, {
        ClientId: userPoolClient.ClientId,
        ChallengeName: "SELECT_MFA_TYPE",
        Session: "sess",
        ChallengeResponses: {
          USERNAME: user.Username,
          ANSWER: "SMS_MFA",
        },
      });

      expect(result.ChallengeName).toEqual("SMS_MFA");
      expect(mockMessages.deliver).toHaveBeenCalled();
      expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
        TestContext,
        expect.objectContaining({ MFACode: "123456" }),
      );
    });

    it("rejects an unknown ANSWER", async () => {
      const user = TDB.user();
      mockUserPoolService.getUserByUsername.mockResolvedValue(user);

      await expect(
        respondToAuthChallenge(TestContext, {
          ClientId: userPoolClient.ClientId,
          ChallengeName: "SELECT_MFA_TYPE",
          Session: "sess",
          ChallengeResponses: {
            USERNAME: user.Username,
            ANSWER: "BOGUS",
          },
        }),
      ).rejects.toBeInstanceOf(InvalidParameterError);
    });
  });
});
