import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import * as TDB from "../__tests__/testDataBuilder";
import { CognitoService, UserPoolService } from "../services";
import { RevokeToken, RevokeTokenTarget } from "./revokeToken";

describe("AdminInitiateAuth target", () => {
  let revokeToken: RevokeTokenTarget;

  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let mockCognitoService: jest.Mocked<CognitoService>;

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

    await revokeToken({
      ClientId: "clientId",
      Token: "token",
    });

    expect(mockUserPoolService.saveUser).toBeCalledWith(
      expect.objectContaining({
        RefreshTokens: [],
      })
    );
  });
});
