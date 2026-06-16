import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import type { UserPoolService } from "../services";
import {
  DeleteUserPoolDomain,
  type DeleteUserPoolDomainTarget,
} from "./deleteUserPoolDomain";

describe("DeleteUserPoolDomain target", () => {
  let deleteUserPoolDomain: DeleteUserPoolDomainTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService({
      Id: "test-pool",
      Domain: "my-domain",
    });
    deleteUserPoolDomain = DeleteUserPoolDomain({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("clears the domain from pool options", async () => {
    await deleteUserPoolDomain(TestContext, {
      UserPoolId: "test-pool",
      Domain: "my-domain",
    });

    expect(mockUserPoolService.updateOptions).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        Domain: undefined,
        CustomDomain: undefined,
      }),
    );
  });
});
