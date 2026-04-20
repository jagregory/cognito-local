import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import type { UserPoolService } from "../services";
import {
  CreateResourceServer,
  type CreateResourceServerTarget,
} from "./createResourceServer";

describe("CreateResourceServer target", () => {
  let createResourceServer: CreateResourceServerTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService({ Id: "test-pool" });
    createResourceServer = CreateResourceServer({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("creates a resource server", async () => {
    const result = await createResourceServer(TestContext, {
      UserPoolId: "test-pool",
      Identifier: "https://api.example.com",
      Name: "My API",
      Scopes: [{ ScopeName: "read", ScopeDescription: "Read access" }],
    });

    expect(result.ResourceServer).toMatchObject({
      UserPoolId: "test-pool",
      Identifier: "https://api.example.com",
      Name: "My API",
      Scopes: [{ ScopeName: "read", ScopeDescription: "Read access" }],
    });

    expect(mockUserPoolService.updateOptions).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        _resourceServers: [
          expect.objectContaining({ Identifier: "https://api.example.com" }),
        ],
      }),
    );
  });
});
