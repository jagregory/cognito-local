import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockTokenGenerator } from "../__tests__/mockTokenGenerator";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { CognitoService, UserPoolService } from "../services";
import { TokenGenerator } from "../services/tokenGenerator";

import { GetToken, GetTokenTarget } from "./getToken";

describe("GetToken target", () => {
  let getToken: GetTokenTarget;
  let mockCognitoService: jest.Mocked<CognitoService>;
  let mockTokenGenerator: jest.Mocked<TokenGenerator>;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  const userPoolClient = TDB.appClient();

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService({
      Id: userPoolClient.UserPoolId,
    });
    mockCognitoService = newMockCognitoService(mockUserPoolService);
    mockCognitoService.getAppClient.mockResolvedValue(userPoolClient);
    mockTokenGenerator = newMockTokenGenerator();
    getToken = GetToken({
      cognito: mockCognitoService,
      tokenGenerator: mockTokenGenerator,
    });
  });

  it("issues access tokens via refresh tokens", async () => {
    mockTokenGenerator.generate.mockResolvedValue({
      AccessToken: "access",
      IdToken: "id",
      RefreshToken: "refresh",
    });

    const existingUser = TDB.user({
      RefreshTokens: ["refresh-orig"],
    });
    mockUserPoolService.getUserByRefreshToken.mockResolvedValue(existingUser);
    mockUserPoolService.listUserGroupMembership.mockResolvedValue([]);

    const response = await getToken(TestContext, {
      client_id: userPoolClient.ClientId,
      grant_type: "refresh_token",
      refresh_token: "refresh-orig",
    });
    expect(mockUserPoolService.getUserByRefreshToken).toHaveBeenCalledWith(
      TestContext,
      "refresh-orig"
    );
    expect(mockUserPoolService.storeRefreshToken).not.toHaveBeenCalled();

    expect(response.access_token).toEqual("access");
    expect(response.refresh_token).toEqual("refresh");
  });
});

describe("GetToken target - Client Creds", () => {
  let getToken: GetTokenTarget;
  let mockCognitoService: jest.Mocked<CognitoService>;
  let mockTokenGenerator: jest.Mocked<TokenGenerator>;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  const userPoolClient = TDB.appClient({
    ClientSecret: "secret",
    ClientId: "id",
  });

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService({
      Id: userPoolClient.UserPoolId,
    });
    mockCognitoService = newMockCognitoService(mockUserPoolService);
    mockCognitoService.getAppClient.mockResolvedValue(userPoolClient);
    mockTokenGenerator = newMockTokenGenerator();
    getToken = GetToken({
      cognito: mockCognitoService,
      tokenGenerator: mockTokenGenerator,
    });
  });

  it("issues access tokens via client credentials", async () => {
    mockTokenGenerator.generateWithClientCreds.mockResolvedValue({
      AccessToken: "access",
      IdToken: "",
      RefreshToken: "",
    });

    const response = await getToken(TestContext, {
      client_id: userPoolClient.ClientId,
      client_secret: userPoolClient.ClientSecret,
      grant_type: "client_credentials",
    });
    expect(response.access_token).toEqual("access");
  });
});
