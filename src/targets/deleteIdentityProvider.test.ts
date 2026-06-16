import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import { ResourceNotFoundError } from "../errors";
import type { UserPoolService } from "../services";
import {
  DeleteIdentityProvider,
  type DeleteIdentityProviderTarget,
} from "./deleteIdentityProvider";

describe("DeleteIdentityProvider target", () => {
  let deleteIdentityProvider: DeleteIdentityProviderTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService({ Id: "test-pool" });
    (mockUserPoolService.options as any)._identityProviders = [
      {
        UserPoolId: "test-pool",
        ProviderName: "Google",
        ProviderType: "Google",
        ProviderDetails: { client_id: "abc" },
        CreationDate: new Date(),
        LastModifiedDate: new Date(),
      },
    ];
    deleteIdentityProvider = DeleteIdentityProvider({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("deletes the identity provider", async () => {
    await deleteIdentityProvider(TestContext, {
      UserPoolId: "test-pool",
      ProviderName: "Google",
    });

    expect(mockUserPoolService.updateOptions).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        _identityProviders: [],
      }),
    );
  });

  it("throws if provider not found", async () => {
    await expect(
      deleteIdentityProvider(TestContext, {
        UserPoolId: "test-pool",
        ProviderName: "NonExistent",
      }),
    ).rejects.toEqual(
      new ResourceNotFoundError("Identity provider not found."),
    );
  });
});
