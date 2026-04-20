import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import { ResourceNotFoundError } from "../errors";
import type { UserPoolService } from "../services";
import {
  DescribeResourceServer,
  type DescribeResourceServerTarget,
} from "./describeResourceServer";

describe("DescribeResourceServer target", () => {
  let describeResourceServer: DescribeResourceServerTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService({ Id: "test-pool" });
    (mockUserPoolService.options as any)._resourceServers = [
      {
        UserPoolId: "test-pool",
        Identifier: "https://api.example.com",
        Name: "My API",
      },
    ];
    describeResourceServer = DescribeResourceServer({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("returns the resource server", async () => {
    const result = await describeResourceServer(TestContext, {
      UserPoolId: "test-pool",
      Identifier: "https://api.example.com",
    });

    expect(result.ResourceServer).toMatchObject({
      Identifier: "https://api.example.com",
      Name: "My API",
    });
  });

  it("throws if resource server not found", async () => {
    await expect(
      describeResourceServer(TestContext, {
        UserPoolId: "test-pool",
        Identifier: "https://unknown.example.com",
      }),
    ).rejects.toEqual(
      new ResourceNotFoundError("Resource server not found."),
    );
  });
});
