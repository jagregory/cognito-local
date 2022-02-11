import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { CognitoService, UserPoolService } from "../services";
import {
  AdminRespondToAuthChallenge,
  AdminRespondToAuthChallengeTarget,
} from "./adminRespondToAuthChallenge";

describe("AdminRespondToAuthChallenge target", () => {
  let adminRespondToAuthChallenge: AdminRespondToAuthChallengeTarget;

  let mockCognitoService: jest.Mocked<CognitoService>;
  let mockUserPoolService: jest.Mocked<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    mockCognitoService = newMockCognitoService(mockUserPoolService);

    adminRespondToAuthChallenge = AdminRespondToAuthChallenge({
      cognito: mockCognitoService,
    });
  });

  it("change user password to auth challenge response password", async () => {
    const existingUser = TDB.user({
      Password: "temp password",
      UserStatus: "NEW_PASSWORD_REQUIRED",
    });

    mockCognitoService.getUserPoolForClientId.mockResolvedValue(
      mockUserPoolService
    );

    mockUserPoolService.getUserByUsername.mockResolvedValue({
      ...existingUser,
    });

    await adminRespondToAuthChallenge(TestContext, {
      ChallengeName: "NEW_PASSWORD_REQUIRED",
      ClientId: "clientId",
      UserPoolId: "test",
      ChallengeResponses: {
        USERNAME: "username",
        NEW_PASSWORD: "password",
      },
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...existingUser,
      Password: "password",
      UserStatus: "CONFIRMED",
    });
  });
});
