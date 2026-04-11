import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import type { UserPoolService } from "../services";
import { TagResource, type TagResourceTarget } from "./tagResource";

describe("TagResource target", () => {
  let tagResource: TagResourceTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService({ Id: "test-pool" });
    tagResource = TagResource({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("adds tags to the pool", async () => {
    await tagResource(TestContext, {
      ResourceArn:
        "arn:aws:cognito-idp:us-east-1:123456789:userpool/test-pool",
      Tags: { env: "production", team: "backend" },
    });

    expect(mockUserPoolService.updateOptions).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        _tags: { env: "production", team: "backend" },
      }),
    );
  });
});
