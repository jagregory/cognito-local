import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
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

const originalDate = new Date();

describe("AdminSetUserMFAPreference target", () => {
  let adminSetUserMFAPreference: AdminSetUserMFAPreferenceTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;
  let clock: ClockFake;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    clock = new ClockFake(originalDate);

    adminSetUserMFAPreference = AdminSetUserMFAPreference({
      clock,
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("turns off a user's software token MFA (e.g. a lost phone)", async () => {
    const existingUser = TDB.user({
      UserMFASettingList: ["SOFTWARE_TOKEN_MFA"],
      PreferredMfaSetting: "SOFTWARE_TOKEN_MFA",
      SoftwareTokenMfaConfiguration: { Secret: "SECRET", Verified: true },
    });
    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);
    const newDate = new Date();
    clock.advanceTo(newDate);

    await adminSetUserMFAPreference(TestContext, {
      UserPoolId: "test",
      Username: existingUser.Username,
      SoftwareTokenMfaSettings: { Enabled: false, PreferredMfa: false },
    });

    expect(mockUserPoolService.getUserByUsername).toHaveBeenCalledWith(
      TestContext,
      existingUser.Username,
    );
    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...existingUser,
      UserMFASettingList: [],
      PreferredMfaSetting: undefined,
      UserLastModifiedDate: newDate,
    });
  });

  it("enables SMS_MFA and marks it preferred", async () => {
    const existingUser = TDB.user();
    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    await adminSetUserMFAPreference(TestContext, {
      UserPoolId: "test",
      Username: existingUser.Username,
      SMSMfaSettings: { Enabled: true, PreferredMfa: true },
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        UserMFASettingList: ["SMS_MFA"],
        PreferredMfaSetting: "SMS_MFA",
      }),
    );
  });

  it("refuses software token MFA the user has not verified", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(TDB.user());

    await expect(
      adminSetUserMFAPreference(TestContext, {
        UserPoolId: "test",
        Username: "user",
        SoftwareTokenMfaSettings: { Enabled: true },
      }),
    ).rejects.toEqual(
      new InvalidParameterError("User has not verified software token MFA"),
    );
    expect(mockUserPoolService.saveUser).not.toHaveBeenCalled();
  });

  it("throws if the user doesn't exist", async () => {
    await expect(
      adminSetUserMFAPreference(TestContext, {
        UserPoolId: "test",
        Username: "user",
        SoftwareTokenMfaSettings: { Enabled: false },
      }),
    ).rejects.toEqual(new UserNotFoundError());
  });
});
