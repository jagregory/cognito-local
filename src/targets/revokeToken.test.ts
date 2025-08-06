import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import type { CognitoService, UserPoolService } from "../services";
import { RevokeToken, type RevokeTokenTarget } from "./revokeToken";

describe("AdminInitiateAuth target", () => {
  let revokeToken: RevokeTokenTarget;

  let mockUserPoolService: MockedObject<UserPoolService>;
  let mockCognitoService: MockedObject<CognitoService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    mockCognitoService = newMockCognitoService(mockUserPoolService);

    revokeToken = RevokeToken({
      cognito: mockCognitoService,
    });
  });

  it("remove refresh tokens from user refresh tokens", async () => {
    const existingUser = TDB.user();
    existingUser.RefreshTokens.push("token");

    mockUserPoolService.listUsers.mockResolvedValue([existingUser]);

    await revokeToken(TestContext, {
      ClientId: "clientId",
      Token: "token",
    });

    expect(mockUserPoolService.saveUser).toBeCalledWith(
      TestContext,
      expect.objectContaining({
        RefreshTokens: [],
      }),
    );
  });
});
