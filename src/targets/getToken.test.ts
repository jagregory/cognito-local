import {newMockCognitoService} from "../__tests__/mockCognitoService";
import {newMockTokenGenerator} from "../__tests__/mockTokenGenerator";
import {newMockTriggers} from "../__tests__/mockTriggers";
import {newMockUserPoolService} from "../__tests__/mockUserPoolService";
import {TestContext} from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import {CognitoService, Triggers, UserPoolService} from "../services";
import {TokenGenerator} from "../services/tokenGenerator";

import {
  GetToken,
  GetTokenTarget,
} from "./getToken";

describe("GetToken target", () => {
  let target: GetTokenTarget;

  let mockCognitoService: jest.Mocked<CognitoService>;
  let mockTokenGenerator: jest.Mocked<TokenGenerator>;
  let mockTriggers: jest.Mocked<Triggers>;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  const userPoolClient = TDB.appClient();

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService({
      Id : userPoolClient.UserPoolId,
    });
    mockCognitoService = newMockCognitoService(mockUserPoolService);
    mockCognitoService.getAppClient.mockResolvedValue(userPoolClient);
    mockTriggers = newMockTriggers();
    mockTokenGenerator = newMockTokenGenerator();
    getToken = GetToken({
      triggers : mockTriggers,
      cognito : mockCognitoService,
      tokenGenerator : mockTokenGenerator,
    });
  });

  it("issues access tokens via refresh tokens", async () => {
    mockTokenGenerator.generate.mockResolvedValue({
      AccessToken : "access",
      IdToken : "id",
      RefreshToken : "refresh",
    });

    const existingUser = TDB.user({
      RefreshTokens : [ "refresh-orig" ],
    });
    mockUserPoolService.getUserByRefreshToken.mockResolvedValue(existingUser);
    mockUserPoolService.listUserGroupMembership.mockResolvedValue([]);

    const response = await getToken(
        TestContext,
        new URLSearchParams(`client_id=${
            userPoolClient
                .ClientId}&grant_type=refresh_token&refresh_token=refresh-orig`));
    expect(mockUserPoolService.getUserByRefreshToken)
        .toHaveBeenCalledWith(TestContext, "refresh-orig");
    expect(mockUserPoolService.storeRefreshToken).not.toHaveBeenCalled();

    expect(response.access_token).toEqual("access");
    expect(response.refresh_token).toEqual("refresh");
  });
});
