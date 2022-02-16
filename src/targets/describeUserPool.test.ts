import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import { CognitoService } from "../services";
import { DescribeUserPool, DescribeUserPoolTarget } from "./describeUserPool";
import * as TDB from "../__tests__/testDataBuilder";

describe("DescribeUserPool target", () => {
  let describeUserPool: DescribeUserPoolTarget;
  let mockCognitoService: jest.Mocked<CognitoService>;

  beforeEach(() => {
    mockCognitoService = newMockCognitoService(newMockUserPoolService());
    describeUserPool = DescribeUserPool({
      cognito: mockCognitoService,
    });
  });

  it("returns an existing user pool", async () => {
    const existingUserPool = TDB.userPool();
    mockCognitoService.getUserPool.mockResolvedValue(
      newMockUserPoolService(existingUserPool)
    );

    const result = await describeUserPool(TestContext, {
      UserPoolId: existingUserPool.Id,
    });

    expect(result).toEqual({
      UserPool: existingUserPool,
    });
  });

  it.todo("throws resource not found for an invalid user pool");
});
