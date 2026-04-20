import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import type { UserPoolService } from "../services";
import {
  CreateUserPoolDomain,
  type CreateUserPoolDomainTarget,
} from "./createUserPoolDomain";

describe("CreateUserPoolDomain target", () => {
  let createUserPoolDomain: CreateUserPoolDomainTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService({ Id: "test-pool" });
    createUserPoolDomain = CreateUserPoolDomain({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("sets the domain on the pool", async () => {
    const result = await createUserPoolDomain(TestContext, {
      UserPoolId: "test-pool",
      Domain: "my-domain",
    });

    expect(result.CloudFrontDomain).toEqual("my-domain");

    expect(mockUserPoolService.updateOptions).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        Domain: "my-domain",
        CustomDomain: undefined,
      }),
    );
  });
});
