import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { CognitoService } from "../services";
import { CreateUserPool, CreateUserPoolTarget } from "./createUserPool";

const originalDate = new Date();

describe("CreateUserPool target", () => {
  let createUserPool: CreateUserPoolTarget;
  let mockCognitoService: jest.Mocked<CognitoService>;

  beforeEach(() => {
    mockCognitoService = newMockCognitoService(newMockUserPoolService());
    createUserPool = CreateUserPool({
      cognito: mockCognitoService,
      clock: new ClockFake(originalDate),
    });
  });

  it("creates a new user pool", async () => {
    const createdUserPool = TDB.userPool();
    mockCognitoService.createUserPool.mockResolvedValue(createdUserPool);

    const result = await createUserPool(TestContext, {
      PoolName: "test-pool",
    });

    expect(mockCognitoService.createUserPool).toHaveBeenCalledWith(
      TestContext,
      {
        Arn: expect.stringMatching(
          /^arn:aws:cognito-idp:local:local:userpool\/local_[\w\d]{8}$/
        ),
        CreationDate: originalDate,
        Id: expect.stringMatching(/^local_[\w\d]{8}$/),
        LastModifiedDate: originalDate,
        Name: "test-pool",
        PoolName: "test-pool",
      }
    );

    expect(result).toEqual({
      UserPool: createdUserPool,
    });
  });
});
