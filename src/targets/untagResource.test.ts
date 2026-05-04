import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import type { UserPoolService } from "../services";
import { UntagResource, type UntagResourceTarget } from "./untagResource";

describe("UntagResource target", () => {
  let untagResource: UntagResourceTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService({ Id: "test-pool" });
    (mockUserPoolService.options as any)._tags = {
      env: "production",
      team: "backend",
      project: "cognito",
    };
    untagResource = UntagResource({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("removes specified tag keys", async () => {
    await untagResource(TestContext, {
      ResourceArn:
        "arn:aws:cognito-idp:us-east-1:123456789:userpool/test-pool",
      TagKeys: ["env", "project"],
    });

    expect(mockUserPoolService.updateOptions).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        _tags: { team: "backend" },
      }),
    );
  });
});
