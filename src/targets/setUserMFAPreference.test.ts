import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import type { UserPoolService } from "../services";
import {
  SetUserMFAPreference,
  type SetUserMFAPreferenceTarget,
} from "./setUserMFAPreference";

const currentDate = new Date();

describe("SetUserMFAPreference target", () => {
  let setUserMFAPreference: SetUserMFAPreferenceTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  const user = TDB.user({ Username: "testuser" });
  const validToken = jwt.sign(
    { sub: user.Username, client_id: "test", token_use: "access", username: user.Username },
    PrivateKey.pem,
    { algorithm: "RS256", keyid: "CognitoLocal" },
  );

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    setUserMFAPreference = SetUserMFAPreference({
      cognito: newMockCognitoService(mockUserPoolService),
      clock: new ClockFake(currentDate),
    });
  });

  it("sets SMS_MFA as preferred", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await setUserMFAPreference(TestContext, {
      AccessToken: validToken,
      SMSMfaSettings: { Enabled: true, PreferredMfa: true },
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...user,
      UserMFASettingList: ["SMS_MFA"],
      PreferredMfaSetting: "SMS_MFA",
      UserLastModifiedDate: currentDate,
    });
  });

  it("sets SOFTWARE_TOKEN_MFA as preferred", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await setUserMFAPreference(TestContext, {
      AccessToken: validToken,
      SoftwareTokenMfaSettings: { Enabled: true, PreferredMfa: true },
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...user,
      UserMFASettingList: ["SOFTWARE_TOKEN_MFA"],
      PreferredMfaSetting: "SOFTWARE_TOKEN_MFA",
      UserLastModifiedDate: currentDate,
    });
  });

  it("sets both MFA types enabled", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await setUserMFAPreference(TestContext, {
      AccessToken: validToken,
      SMSMfaSettings: { Enabled: true, PreferredMfa: false },
      SoftwareTokenMfaSettings: { Enabled: true, PreferredMfa: true },
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...user,
      UserMFASettingList: ["SMS_MFA", "SOFTWARE_TOKEN_MFA"],
      PreferredMfaSetting: "SOFTWARE_TOKEN_MFA",
      UserLastModifiedDate: currentDate,
    });
  });

  it("throws if token is invalid", async () => {
    await expect(
      setUserMFAPreference(TestContext, {
        AccessToken: "invalid",
        SMSMfaSettings: { Enabled: true, PreferredMfa: true },
      }),
    ).rejects.toBeInstanceOf(InvalidParameterError);
  });
});
