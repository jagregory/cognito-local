import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { UserNotFoundError } from "../errors";
import type { UserPoolService } from "../services";
import {
  AdminSetUserMFAPreference,
  type AdminSetUserMFAPreferenceTarget,
} from "./adminSetUserMFAPreference";

const currentDate = new Date();

describe("AdminSetUserMFAPreference target", () => {
  let adminSetUserMFAPreference: AdminSetUserMFAPreferenceTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    adminSetUserMFAPreference = AdminSetUserMFAPreference({
      cognito: newMockCognitoService(mockUserPoolService),
      clock: new ClockFake(currentDate),
    });
  });

  it("sets MFA preference via UserPoolId and Username", async () => {
    const user = TDB.user({ Username: "testuser" });
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    const result = await adminSetUserMFAPreference(TestContext, {
      UserPoolId: "test",
      Username: "testuser",
      SMSMfaSettings: { Enabled: true, PreferredMfa: true },
    });

    expect(result).toEqual({});
    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...user,
      UserMFASettingList: ["SMS_MFA"],
      PreferredMfaSetting: "SMS_MFA",
      UserLastModifiedDate: currentDate,
    });
  });

  it("sets SOFTWARE_TOKEN_MFA preference", async () => {
    const user = TDB.user({ Username: "testuser" });
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await adminSetUserMFAPreference(TestContext, {
      UserPoolId: "test",
      Username: "testuser",
      SoftwareTokenMfaSettings: { Enabled: true, PreferredMfa: true },
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...user,
      UserMFASettingList: ["SOFTWARE_TOKEN_MFA"],
      PreferredMfaSetting: "SOFTWARE_TOKEN_MFA",
      UserLastModifiedDate: currentDate,
    });
  });

  it("throws if user not found", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      adminSetUserMFAPreference(TestContext, {
        UserPoolId: "test",
        Username: "unknown",
        SMSMfaSettings: { Enabled: true, PreferredMfa: true },
      }),
    ).rejects.toBeInstanceOf(UserNotFoundError);

    expect(mockUserPoolService.saveUser).not.toHaveBeenCalled();
  });
});
