import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";

import { CognitoService, UserPoolService } from "../services";
import { RevokeToken, RevokeTokenTarget } from "./revokeToken";
import { MockUser } from "../models/UserModel";

describe("AdminInitiateAuth target", () => {
  let revokeToken: RevokeTokenTarget;

  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let mockCognitoService: jest.Mocked<CognitoService>;

  beforeEach(() => {
    mockUserPoolService = MockUserPoolService();
    mockCognitoService = MockCognitoService(mockUserPoolService);

    revokeToken = RevokeToken({
      cognito: mockCognitoService,
    });
  });

  it("remove refresh tokens from user refresh tokens", async () => {
    const existingUser = MockUser();
    existingUser.RefreshTokens.push("token");

    mockUserPoolService.listUsers.mockResolvedValue([existingUser]);

    await revokeToken(MockContext, {
      ClientId: "clientId",
      Token: "token",
    });

    expect(mockUserPoolService.saveUser).toBeCalledWith(
      MockContext,
      expect.objectContaining({
        RefreshTokens: [],
      })
    );
  });
});
