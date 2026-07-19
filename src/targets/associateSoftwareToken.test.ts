import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockSessionService } from "../__tests__/mockSessionService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import {
  InvalidParameterError,
  NotAuthorizedError,
  UnsupportedError,
} from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import type { SessionService, UserPoolService } from "../services";
import {
  AssociateSoftwareToken,
  type AssociateSoftwareTokenTarget,
} from "./associateSoftwareToken";

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

describe("AssociateSoftwareToken target", () => {
  let associateSoftwareToken: AssociateSoftwareTokenTarget;
  let mockSessions: MockedObject<SessionService>;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService({
      Id: "pool",
      SoftwareTokenMfaConfiguration: { Enabled: true },
    });
    mockSessions = newMockSessionService();
    associateSoftwareToken = AssociateSoftwareToken({
      cognito: newMockCognitoService(mockUserPoolService),
      sessions: mockSessions,
    });
  });

  it("rejects when neither AccessToken nor Session provided", async () => {
    await expect(
      associateSoftwareToken(TestContext, {}),
    ).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("generates and stores a TOTP secret for the authed user", async () => {
    const user = TDB.user();
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    const result = await associateSoftwareToken(TestContext, {
      AccessToken: signAccessToken(user.Username),
    });

    expect(result.SecretCode).toMatch(/^[A-Z2-7]+=*$/);
    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        Username: user.Username,
        SoftwareTokenMfaConfiguration: {
          Secret: result.SecretCode,
          Verified: false,
        },
      }),
    );
    expect(mockSessions.get).not.toHaveBeenCalled();
  });

  it("stores a secret and rotates an MFA_SETUP session", async () => {
    const user = TDB.user();
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);
    mockSessions.get.mockReturnValue({
      clientId: "client",
      expiresAt: Date.now() + 60_000,
      purpose: "MFA_SETUP",
      userPoolId: "pool",
      username: user.Username,
    });
    mockSessions.rotate.mockReturnValue("rotated-session");

    const result = await associateSoftwareToken(TestContext, {
      Session: "initial-session",
    });

    expect(result).toEqual({
      SecretCode: expect.stringMatching(/^[A-Z2-7]+=*$/),
      Session: "rotated-session",
    });
    expect(mockSessions.rotate).toHaveBeenCalledWith("initial-session");
  });

  it("rejects an invalid MFA_SETUP session", async () => {
    mockSessions.get.mockReturnValue(null);

    await expect(
      associateSoftwareToken(TestContext, { Session: "invalid" }),
    ).rejects.toEqual(new NotAuthorizedError("Invalid session for the user."));
    expect(mockUserPoolService.saveUser).not.toHaveBeenCalled();
  });

  it("rejects session enrollment when the pool only supports SMS", async () => {
    const user = TDB.user();
    mockUserPoolService.options.SoftwareTokenMfaConfiguration = undefined;
    mockSessions.get.mockReturnValue({
      clientId: "client",
      expiresAt: Date.now() + 60_000,
      purpose: "MFA_SETUP",
      userPoolId: "pool",
      username: user.Username,
    });

    await expect(
      associateSoftwareToken(TestContext, { Session: "sms-only-session" }),
    ).rejects.toEqual(
      new UnsupportedError(
        "MFA_SETUP supports only SOFTWARE_TOKEN_MFA enrollment",
      ),
    );
    expect(mockUserPoolService.saveUser).not.toHaveBeenCalled();
  });
});
