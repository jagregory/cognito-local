import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { InvalidParameterError } from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import type { UserPoolService } from "../services";
import {
  SetUserMFAPreference,
  type SetUserMFAPreferenceTarget,
} from "./setUserMFAPreference";

const signAccessToken = (sub: string) =>
  jwt.sign(
    {
      sub,
      event_id: "0",
      token_use: "access",
      scope: "aws.cognito.signin.user.admin",
      auth_time: new Date(),
      jti: uuid.v4(),
      client_id: "test",
      username: sub,
    },
    PrivateKey.pem,
    {
      algorithm: "RS256",
      issuer: "http://localhost:9229/test",
      expiresIn: "24h",
      keyid: "CognitoLocal",
    },
  );

describe("SetUserMFAPreference target", () => {
  let setUserMFAPreference: SetUserMFAPreferenceTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    setUserMFAPreference = SetUserMFAPreference({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("enables SMS_MFA and marks it preferred", async () => {
    const user = TDB.user();
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await setUserMFAPreference(TestContext, {
      AccessToken: signAccessToken(user.Username),
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

  it("disables a previously-enabled method", async () => {
    const user = TDB.user({
      UserMFASettingList: ["SMS_MFA", "SOFTWARE_TOKEN_MFA"],
      PreferredMfaSetting: "SMS_MFA",
      SoftwareTokenMfaConfiguration: {
        Secret: "SECRET",
        Verified: true,
      },
    });
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await setUserMFAPreference(TestContext, {
      AccessToken: signAccessToken(user.Username),
      SMSMfaSettings: { Enabled: false },
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        UserMFASettingList: ["SOFTWARE_TOKEN_MFA"],
        PreferredMfaSetting: undefined,
      }),
    );
  });

  it("rejects enabling SOFTWARE_TOKEN_MFA without verified secret", async () => {
    const user = TDB.user();
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await expect(
      setUserMFAPreference(TestContext, {
        AccessToken: signAccessToken(user.Username),
        SoftwareTokenMfaSettings: { Enabled: true },
      }),
    ).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("accepts enabling SOFTWARE_TOKEN_MFA when secret is verified", async () => {
    const user = TDB.user({
      SoftwareTokenMfaConfiguration: { Secret: "s", Verified: true },
    });
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await setUserMFAPreference(TestContext, {
      AccessToken: signAccessToken(user.Username),
      SoftwareTokenMfaSettings: { Enabled: true, PreferredMfa: true },
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        UserMFASettingList: ["SOFTWARE_TOKEN_MFA"],
        PreferredMfaSetting: "SOFTWARE_TOKEN_MFA",
      }),
    );
  });
});
