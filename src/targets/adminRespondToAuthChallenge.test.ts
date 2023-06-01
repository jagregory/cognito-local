import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockTokenGenerator } from "../__tests__/mockTokenGenerator";
import { newMockTriggers } from "../__tests__/mockTriggers";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import {
  CodeMismatchError,
  InvalidParameterError,
  NotAuthorizedError,
} from "../errors";
import { Triggers, UserPoolService } from "../services";
import { TokenGenerator } from "../services/tokenGenerator";
import {
  AdminRespondToAuthChallenge,
  AdminRespondToAuthChallengeTarget,
} from "./adminRespondToAuthChallenge";
import * as TDB from "../__tests__/testDataBuilder";

const currentDate = new Date();

describe("AdminRespondToAuthChallenge target", () => {
  let adminRespondToAuthChallenge: AdminRespondToAuthChallengeTarget;
  let mockTokenGenerator: jest.Mocked<TokenGenerator>;
  let mockTriggers: jest.Mocked<Triggers>;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let clock: ClockFake;
  const userPoolClient = TDB.appClient();

  beforeEach(() => {
    clock = new ClockFake(currentDate);
    mockTokenGenerator = newMockTokenGenerator();
    mockTriggers = newMockTriggers();
    mockUserPoolService = newMockUserPoolService({
      Id: userPoolClient.UserPoolId,
    });

    const mockCognitoService = newMockCognitoService(mockUserPoolService);
    mockCognitoService.getAppClient.mockResolvedValue(userPoolClient);

    adminRespondToAuthChallenge = AdminRespondToAuthChallenge({
      clock,
      cognito: mockCognitoService,
      tokenGenerator: mockTokenGenerator,
      triggers: mockTriggers,
    });
  });

  it("throws if user doesn't exist", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      adminRespondToAuthChallenge(TestContext, {
        ClientId: "clientId",
        UserPoolId: "test",
        ChallengeName: "SMS_MFA",
        ChallengeResponses: {
          USERNAME: "username",
          SMS_MFA_CODE: "123456",
        },
        Session: "Session",
      })
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws if ChallengeResponses missing", async () => {
    await expect(
      adminRespondToAuthChallenge(TestContext, {
        ClientId: "clientId",
        UserPoolId: "test",
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
      adminRespondToAuthChallenge(TestContext, {
        ClientId: "clientId",
        UserPoolId: "test",
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
      adminRespondToAuthChallenge(TestContext, {
        ClientId: userPoolClient.ClientId,
        UserPoolId: "test",
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
      MFACode: "123456",
    });

    beforeEach(() => {
      mockUserPoolService.getUserByUsername.mockResolvedValue(user);
    });

    describe("when code matches", () => {
      it("updates the user and removes the MFACode", async () => {
        const newDate = clock.advanceBy(1200);

        await adminRespondToAuthChallenge(TestContext, {
          ClientId: userPoolClient.ClientId,
          ChallengeName: "SMS_MFA",
          ChallengeResponses: {
            USERNAME: user.Username,
            SMS_MFA_CODE: "123456",
          },
          UserPoolId: "test",
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

        const output = await adminRespondToAuthChallenge(TestContext, {
          ClientId: userPoolClient.ClientId,
          UserPoolId: userPoolClient.UserPoolId,
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
          "Authentication"
        );
      });

      describe("when Post Authentication trigger is enabled", () => {
        it("does invokes the trigger", async () => {
          mockTriggers.enabled.mockImplementation(
            (trigger) => trigger === "PostAuthentication"
          );

          await adminRespondToAuthChallenge(TestContext, {
            ClientId: userPoolClient.ClientId,
            UserPoolId: userPoolClient.UserPoolId,
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
            }
          );
        });
      });
    });

    describe("when code is incorrect", () => {
      it("throws an error", async () => {
        mockUserPoolService.getUserByUsername.mockResolvedValue(user);

        await expect(
          adminRespondToAuthChallenge(TestContext, {
            ClientId: userPoolClient.ClientId,
            UserPoolId: userPoolClient.UserPoolId,
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
        adminRespondToAuthChallenge(TestContext, {
          ClientId: userPoolClient.ClientId,
          UserPoolId: userPoolClient.UserPoolId,
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

      await adminRespondToAuthChallenge(TestContext, {
        ClientId: userPoolClient.ClientId,
        UserPoolId: userPoolClient.UserPoolId,
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

      const output = await adminRespondToAuthChallenge(TestContext, {
        ClientId: userPoolClient.ClientId,
        UserPoolId: userPoolClient.UserPoolId,
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
        "Authentication"
      );
    });

    describe("when Post Authentication trigger is enabled", () => {
      it("does invokes the trigger", async () => {
        mockTriggers.enabled.mockImplementation(
          (trigger) => trigger === "PostAuthentication"
        );

        await adminRespondToAuthChallenge(TestContext, {
          ClientId: userPoolClient.ClientId,
          UserPoolId: userPoolClient.UserPoolId,
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
          }
        );
      });
    });
  });
});
