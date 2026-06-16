import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import { ResourceNotFoundError } from "../errors";
import type { UserPoolService } from "../services";
import {
  DeleteResourceServer,
  type DeleteResourceServerTarget,
} from "./deleteResourceServer";

describe("DeleteResourceServer target", () => {
  let deleteResourceServer: DeleteResourceServerTarget;
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
    deleteResourceServer = DeleteResourceServer({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("deletes the resource server", async () => {
    await deleteResourceServer(TestContext, {
      UserPoolId: "test-pool",
      Identifier: "https://api.example.com",
    });

    expect(mockUserPoolService.updateOptions).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        _resourceServers: [],
      }),
    );
  });

  it("throws if resource server not found", async () => {
    await expect(
      deleteResourceServer(TestContext, {
        UserPoolId: "test-pool",
        Identifier: "https://unknown.example.com",
      }),
    ).rejects.toEqual(
      new ResourceNotFoundError("Resource server not found."),
    );
  });
});
