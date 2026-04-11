import jwt from "jsonwebtoken";
import { TOTP } from "otpauth";
import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import {
  CodeMismatchError,
  InvalidParameterError,
} from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import type { UserPoolService } from "../services";
import {
  VerifySoftwareToken,
  type VerifySoftwareTokenTarget,
} from "./verifySoftwareToken";

const currentDate = new Date();
const TEST_TOTP_SECRET = "JBSWY3DPEHPK3PXP";

describe("VerifySoftwareToken target", () => {
  let verifySoftwareToken: VerifySoftwareTokenTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    verifySoftwareToken = VerifySoftwareToken({
      cognito: newMockCognitoService(mockUserPoolService),
      clock: new ClockFake(currentDate),
    });
  });

  it("verifies a valid TOTP code and adds SOFTWARE_TOKEN_MFA", async () => {
    const user = TDB.user({
      Username: "testuser",
      TOTPSecret: TEST_TOTP_SECRET,
      UserMFASettingList: [],
    });
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    const totp = new TOTP({ secret: TEST_TOTP_SECRET, algorithm: "SHA1", digits: 6, period: 30 });
    const validCode = totp.generate();

    const validToken = jwt.sign(
      { sub: user.Username, client_id: "test", token_use: "access", username: user.Username },
      PrivateKey.pem,
      { algorithm: "RS256", keyid: "CognitoLocal" },
    );

    const result = await verifySoftwareToken(TestContext, {
      AccessToken: validToken,
      UserCode: validCode,
    });

    expect(result.Status).toBe("SUCCESS");
    expect(result.Session).toBeDefined();
    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        UserMFASettingList: ["SOFTWARE_TOKEN_MFA"],
        UserLastModifiedDate: currentDate,
      }),
    );
  });

  it("throws if UserCode is missing", async () => {
    await expect(
      verifySoftwareToken(TestContext, {
        AccessToken: "some-token",
        UserCode: "",
      }),
    ).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("throws if neither AccessToken nor Session provided", async () => {
    await expect(
      verifySoftwareToken(TestContext, {
        UserCode: "123456",
      }),
    ).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("throws CodeMismatchError for wrong TOTP code", async () => {
    const user = TDB.user({
      Username: "testuser",
      TOTPSecret: TEST_TOTP_SECRET,
    });
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    const validToken = jwt.sign(
      { sub: user.Username, client_id: "test", token_use: "access", username: user.Username },
      PrivateKey.pem,
      { algorithm: "RS256", keyid: "CognitoLocal" },
    );

    await expect(
      verifySoftwareToken(TestContext, {
        AccessToken: validToken,
        UserCode: "000000",
      }),
    ).rejects.toBeInstanceOf(CodeMismatchError);
  });
});
