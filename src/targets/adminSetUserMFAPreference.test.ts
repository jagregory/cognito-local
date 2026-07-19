import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import type { UserPoolService } from "../services";
import {
  AdminSetUserMFAPreference,
  type AdminSetUserMFAPreferenceTarget,
} from "./adminSetUserMFAPreference";

describe("AdminSetUserMFAPreference target", () => {
  let adminSetUserMFAPreference: AdminSetUserMFAPreferenceTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    adminSetUserMFAPreference = AdminSetUserMFAPreference({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("enables verified software token MFA and marks it preferred", async () => {
    const user = TDB.user({
      SoftwareTokenMfaConfiguration: { Secret: "secret", Verified: true },
    });
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await adminSetUserMFAPreference(TestContext, {
      SoftwareTokenMfaSettings: { Enabled: true, PreferredMfa: true },
      Username: user.Username,
      UserPoolId: "pool",
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        UserMFASettingList: ["SOFTWARE_TOKEN_MFA"],
        PreferredMfaSetting: "SOFTWARE_TOKEN_MFA",
      }),
    );
  });

  it("disables a previously enabled method", async () => {
    const user = TDB.user({
      PreferredMfaSetting: "SOFTWARE_TOKEN_MFA",
      SoftwareTokenMfaConfiguration: { Secret: "secret", Verified: true },
      UserMFASettingList: ["SOFTWARE_TOKEN_MFA"],
    });
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await adminSetUserMFAPreference(TestContext, {
      SoftwareTokenMfaSettings: { Enabled: false },
      Username: user.Username,
      UserPoolId: "pool",
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        UserMFASettingList: [],
        PreferredMfaSetting: undefined,
      }),
    );
  });

  it("rejects enabling an unverified software token", async () => {
    const user = TDB.user();
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await expect(
      adminSetUserMFAPreference(TestContext, {
        SoftwareTokenMfaSettings: { Enabled: true },
        Username: user.Username,
        UserPoolId: "pool",
      }),
    ).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("rejects a missing user", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      adminSetUserMFAPreference(TestContext, {
        SMSMfaSettings: { Enabled: true },
        Username: "missing",
        UserPoolId: "pool",
      }),
    ).rejects.toEqual(new UserNotFoundError("User does not exist."));
  });
});
