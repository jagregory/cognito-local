import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { CognitoService, UserPoolService } from "../services";
import { UpdateUserPool, UpdateUserPoolTarget } from "./updateUserPool";

describe("UpdateUserPool target", () => {
  let updateUserPool: UpdateUserPoolTarget;
  let mockCognitoService: jest.Mocked<CognitoService>;
  let mockUserPoolService: jest.Mocked<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    mockCognitoService = newMockCognitoService(mockUserPoolService);

    updateUserPool = UpdateUserPool({
      cognito: mockCognitoService,
    });
  });

  it("updates a user pool", async () => {
    const existingUserPool = TDB.userPool({
      Name: "name",
    });

    const userPoolService = newMockUserPoolService(existingUserPool);

    mockCognitoService.getUserPool.mockResolvedValue(userPoolService);

    await updateUserPool(TestContext, {
      UserPoolId: existingUserPool.Id,
      MfaConfiguration: "OPTIONAL",
    });

    expect(userPoolService.update).toHaveBeenCalledWith(TestContext, {
      ...existingUserPool,
      MfaConfiguration: "OPTIONAL",
    });
  });

  it.todo("throws if the user pool client doesn't exist");
});
