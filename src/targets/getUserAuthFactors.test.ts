import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import type { UserPoolService } from "../services";
import {
  GetUserAuthFactors,
  type GetUserAuthFactorsTarget,
} from "./getUserAuthFactors";

describe("GetUserAuthFactors target", () => {
  let getUserAuthFactors: GetUserAuthFactorsTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    getUserAuthFactors = GetUserAuthFactors({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("returns PASSWORD factor for user with no MFA", async () => {
    const user = TDB.user({ Username: "testuser" });
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    const validToken = jwt.sign(
      { sub: user.Username, client_id: "test", token_use: "access", username: user.Username },
      PrivateKey.pem,
      { algorithm: "RS256", keyid: "CognitoLocal" },
    );

    const result = await getUserAuthFactors(TestContext, {
      AccessToken: validToken,
    });

    expect(result.Username).toBe("testuser");
    expect(result.ConfiguredUserAuthFactors).toEqual(["PASSWORD"]);
  });

  it("returns SMS and TOTP factors when MFA configured", async () => {
    const user = TDB.user({
      Username: "testuser",
      UserMFASettingList: ["SMS_MFA", "SOFTWARE_TOKEN_MFA"],
      PreferredMfaSetting: "SOFTWARE_TOKEN_MFA",
    });
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    const validToken = jwt.sign(
      { sub: user.Username, client_id: "test", token_use: "access", username: user.Username },
      PrivateKey.pem,
      { algorithm: "RS256", keyid: "CognitoLocal" },
    );

    const result = await getUserAuthFactors(TestContext, {
      AccessToken: validToken,
    });

    expect(result.Username).toBe("testuser");
    expect(result.PreferredMfaSetting).toBe("SOFTWARE_TOKEN_MFA");
    expect(result.UserMFASettingList).toEqual(["SMS_MFA", "SOFTWARE_TOKEN_MFA"]);
    expect(result.ConfiguredUserAuthFactors).toEqual(["PASSWORD", "SMS", "TOTP"]);
  });

  it("throws if token is invalid", async () => {
    await expect(
      getUserAuthFactors(TestContext, { AccessToken: "invalid" }),
    ).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("throws if user not found", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    const validToken = jwt.sign(
      { sub: "unknown", client_id: "test", token_use: "access", username: "unknown" },
      PrivateKey.pem,
      { algorithm: "RS256", keyid: "CognitoLocal" },
    );

    await expect(
      getUserAuthFactors(TestContext, { AccessToken: validToken }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });
});
