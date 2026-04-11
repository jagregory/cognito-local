import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
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
import type { Triggers, UserPoolService } from "../services";
import type { TokenGenerator } from "../services/tokenGenerator";
import {
  AdminRespondToAuthChallenge,
  type AdminRespondToAuthChallengeTarget,
} from "./adminRespondToAuthChallenge";

const currentDate = new Date();

describe("AdminRespondToAuthChallenge target", () => {
  let adminRespondToAuthChallenge: AdminRespondToAuthChallengeTarget;
  let mockTokenGenerator: MockedObject<TokenGenerator>;
  let mockTriggers: MockedObject<Triggers>;
  let mockUserPoolService: MockedObject<UserPoolService>;
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
        ClientId: userPoolClient.ClientId,
        UserPoolId: userPoolClient.UserPoolId,
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
      adminRespondToAuthChallenge(TestContext, {
        ClientId: userPoolClient.ClientId,
        UserPoolId: userPoolClient.UserPoolId,
        ChallengeName: "SMS_MFA",
      }),
    ).rejects.toEqual(
      new InvalidParameterError(
        "Missing required parameter challenge responses",
      ),
    );
  });

  describe("ChallengeName=SMS_MFA", () => {
    const user = TDB.user({ MFACode: "123456" });

    beforeEach(() => {
      mockUserPoolService.getUserByUsername.mockResolvedValue(user);
    });

    it("updates the user and removes MFACode when code matches", async () => {
      const newDate = clock.advanceBy(1200);

      await adminRespondToAuthChallenge(TestContext, {
        ClientId: userPoolClient.ClientId,
        UserPoolId: userPoolClient.UserPoolId,
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

      const output = await adminRespondToAuthChallenge(TestContext, {
        ClientId: userPoolClient.ClientId,
        UserPoolId: userPoolClient.UserPoolId,
        ChallengeName: "SMS_MFA",
        ChallengeResponses: {
          USERNAME: user.Username,
          SMS_MFA_CODE: "123456",
        },
        Session: "Session",
      });

      expect(output.AuthenticationResult?.AccessToken).toEqual("access");
      expect(output.AuthenticationResult?.IdToken).toEqual("id");
      expect(output.AuthenticationResult?.RefreshToken).toEqual("refresh");
    });

    it("throws when code is incorrect", async () => {
      await expect(
        adminRespondToAuthChallenge(TestContext, {
          ClientId: userPoolClient.ClientId,
          UserPoolId: userPoolClient.UserPoolId,
          ChallengeName: "SMS_MFA",
          ChallengeResponses: {
            USERNAME: user.Username,
            SMS_MFA_CODE: "wrong",
          },
          Session: "Session",
        }),
      ).rejects.toBeInstanceOf(CodeMismatchError);
    });
  });

  describe("ChallengeName=SOFTWARE_TOKEN_MFA", () => {
    const user = TDB.user({ MFACode: "654321" });

    beforeEach(() => {
      mockUserPoolService.getUserByUsername.mockResolvedValue(user);
    });

    it("generates tokens when code matches", async () => {
      mockTokenGenerator.generate.mockResolvedValue({
        AccessToken: "access",
        IdToken: "id",
        RefreshToken: "refresh",
      });
      mockUserPoolService.listUserGroupMembership.mockResolvedValue([]);

      const output = await adminRespondToAuthChallenge(TestContext, {
        ClientId: userPoolClient.ClientId,
        UserPoolId: userPoolClient.UserPoolId,
        ChallengeName: "SOFTWARE_TOKEN_MFA",
        ChallengeResponses: {
          USERNAME: user.Username,
          SOFTWARE_TOKEN_MFA_CODE: "654321",
        },
        Session: "Session",
      });

      expect(output.AuthenticationResult?.AccessToken).toEqual("access");
    });

    it("throws when code is incorrect", async () => {
      await expect(
        adminRespondToAuthChallenge(TestContext, {
          ClientId: userPoolClient.ClientId,
          UserPoolId: userPoolClient.UserPoolId,
          ChallengeName: "SOFTWARE_TOKEN_MFA",
          ChallengeResponses: {
            USERNAME: user.Username,
            SOFTWARE_TOKEN_MFA_CODE: "wrong",
          },
          Session: "Session",
        }),
      ).rejects.toBeInstanceOf(CodeMismatchError);
    });
  });

  describe("ChallengeName=NEW_PASSWORD_REQUIRED", () => {
    const user = TDB.user();

    beforeEach(() => {
      mockUserPoolService.getUserByUsername.mockResolvedValue(user);
    });

    it("updates the user's password and status", async () => {
      const newDate = clock.advanceBy(1200);

      await adminRespondToAuthChallenge(TestContext, {
        ClientId: userPoolClient.ClientId,
        UserPoolId: userPoolClient.UserPoolId,
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        ChallengeResponses: {
          USERNAME: user.Username,
          NEW_PASSWORD: "newpass",
        },
        Session: "Session",
      });

      expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
        ...user,
        Password: "newpass",
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
          NEW_PASSWORD: "newpass",
        },
        Session: "Session",
      });

      expect(output.AuthenticationResult?.AccessToken).toEqual("access");
    });
  });
});
