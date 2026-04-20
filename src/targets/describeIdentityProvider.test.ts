import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import { ResourceNotFoundError } from "../errors";
import type { UserPoolService } from "../services";
import {
  DescribeIdentityProvider,
  type DescribeIdentityProviderTarget,
} from "./describeIdentityProvider";

describe("DescribeIdentityProvider target", () => {
  let describeIdentityProvider: DescribeIdentityProviderTarget;
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
    describeIdentityProvider = DescribeIdentityProvider({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("returns the identity provider", async () => {
    const result = await describeIdentityProvider(TestContext, {
      UserPoolId: "test-pool",
      ProviderName: "Google",
    });

    expect(result.IdentityProvider).toMatchObject({
      ProviderName: "Google",
      ProviderType: "Google",
    });
  });

  it("throws if provider not found", async () => {
    await expect(
      describeIdentityProvider(TestContext, {
        UserPoolId: "test-pool",
        ProviderName: "NonExistent",
      }),
    ).rejects.toEqual(
      new ResourceNotFoundError("Identity provider not found."),
    );
  });
});
