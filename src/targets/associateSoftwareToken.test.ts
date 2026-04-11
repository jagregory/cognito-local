import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { InvalidParameterError } from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import type { UserPoolService } from "../services";
import {
  AssociateSoftwareToken,
  type AssociateSoftwareTokenTarget,
} from "./associateSoftwareToken";

const currentDate = new Date();

describe("AssociateSoftwareToken target", () => {
  let associateSoftwareToken: AssociateSoftwareTokenTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    associateSoftwareToken = AssociateSoftwareToken({
      cognito: newMockCognitoService(mockUserPoolService),
      clock: new ClockFake(currentDate),
    });
  });

  it("generates TOTP secret and saves on user when AccessToken provided", async () => {
    const user = TDB.user({ Username: "testuser" });
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    const validToken = jwt.sign(
      { sub: user.Username, client_id: "test", token_use: "access", username: user.Username },
      PrivateKey.pem,
      { algorithm: "RS256", keyid: "CognitoLocal" },
    );

    const result = await associateSoftwareToken(TestContext, {
      AccessToken: validToken,
    });

    expect(result.SecretCode).toBeDefined();
    expect(result.SecretCode!.length).toBeGreaterThan(0);
    expect(result.Session).toBeDefined();
    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        TOTPSecret: result.SecretCode,
        UserLastModifiedDate: currentDate,
      }),
    );
  });

  it("returns SecretCode and Session when only Session is provided", async () => {
    const result = await associateSoftwareToken(TestContext, {
      Session: "some-session",
    });

    expect(result.SecretCode).toBeDefined();
    expect(result.Session).toBeDefined();
    expect(mockUserPoolService.saveUser).not.toHaveBeenCalled();
  });

  it("throws if neither AccessToken nor Session provided", async () => {
    await expect(
      associateSoftwareToken(TestContext, {}),
    ).rejects.toBeInstanceOf(InvalidParameterError);
  });
});
