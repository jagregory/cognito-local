import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import type { CognitoService } from "../services";
import { DeleteUserPool, type DeleteUserPoolTarget } from "./deleteUserPool";

describe("DeleteUserPool target", () => {
  let deleteUserPool: DeleteUserPoolTarget;
  let mockCognitoService: MockedObject<CognitoService>;

  beforeEach(() => {
    mockCognitoService = newMockCognitoService(newMockUserPoolService());

    deleteUserPool = DeleteUserPool({
      cognito: mockCognitoService,
    });
  });

  it("deletes a user pool client", async () => {
    const userPool = TDB.userPool();

    mockCognitoService.getUserPool.mockResolvedValue(
      newMockUserPoolService(userPool),
    );

    await deleteUserPool(TestContext, {
      UserPoolId: "test",
    });

    expect(mockCognitoService.deleteUserPool).toHaveBeenCalledWith(
      TestContext,
      userPool,
    );
  });

  it.todo("throws if the user pool doesn't exist");
});
