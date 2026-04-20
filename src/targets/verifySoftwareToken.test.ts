import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { CodeMismatchError, InvalidParameterError } from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import type { UserPoolService } from "../services";
import { generate, generateSecret } from "../services/totp";
import {
  VerifySoftwareToken,
  type VerifySoftwareTokenTarget,
} from "./verifySoftwareToken";

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

describe("VerifySoftwareToken target", () => {
  let verifySoftwareToken: VerifySoftwareTokenTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    verifySoftwareToken = VerifySoftwareToken({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("verifies a correct code and marks the secret verified", async () => {
    const secret = generateSecret();
    const user = TDB.user({
      SoftwareTokenMfaConfiguration: { Secret: secret, Verified: false },
    });
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    const result = await verifySoftwareToken(TestContext, {
      AccessToken: signAccessToken(user.Username),
      UserCode: generate(secret),
      FriendlyDeviceName: "iPhone",
    });

    expect(result.Status).toBe("SUCCESS");
    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        SoftwareTokenMfaConfiguration: {
          Secret: secret,
          Verified: true,
          FriendlyDeviceName: "iPhone",
        },
        UserMFASettingList: ["SOFTWARE_TOKEN_MFA"],
      }),
    );
  });

  it("rejects a wrong code", async () => {
    const secret = generateSecret();
    const user = TDB.user({
      SoftwareTokenMfaConfiguration: { Secret: secret, Verified: false },
    });
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await expect(
      verifySoftwareToken(TestContext, {
        AccessToken: signAccessToken(user.Username),
        UserCode: "000000",
      }),
    ).rejects.toBeInstanceOf(CodeMismatchError);
    expect(mockUserPoolService.saveUser).not.toHaveBeenCalled();
  });

  it("rejects when the user has no associated secret", async () => {
    const user = TDB.user();
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await expect(
      verifySoftwareToken(TestContext, {
        AccessToken: signAccessToken(user.Username),
        UserCode: "123456",
      }),
    ).rejects.toBeInstanceOf(InvalidParameterError);
  });
});
