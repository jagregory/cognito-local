import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import type { CognitoService } from "../services";
import {
  DescribeUserPoolDomain,
  type DescribeUserPoolDomainTarget,
} from "./describeUserPoolDomain";

describe("DescribeUserPoolDomain target", () => {
  let describeUserPoolDomain: DescribeUserPoolDomainTarget;
  let mockCognitoService: MockedObject<CognitoService>;

  beforeEach(() => {
    mockCognitoService = newMockCognitoService();
    describeUserPoolDomain = DescribeUserPoolDomain({
      cognito: mockCognitoService,
    });
  });

  it("returns the domain description when found", async () => {
    mockCognitoService.listUserPools.mockResolvedValue([
      { Id: "pool-1", Domain: "test-domain" } as any,
    ]);

    const result = await describeUserPoolDomain(TestContext, {
      Domain: "test-domain",
    });

    expect(result.DomainDescription).toEqual({
      Domain: "test-domain",
      UserPoolId: "pool-1",
      Status: "ACTIVE",
    });
  });

  it("returns empty description when domain not found", async () => {
    mockCognitoService.listUserPools.mockResolvedValue([]);

    const result = await describeUserPoolDomain(TestContext, {
      Domain: "nonexistent",
    });

    expect(result.DomainDescription).toEqual({});
  });
});
