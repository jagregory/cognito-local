import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import type { UserPoolService } from "../services";
import {
  ListTagsForResource,
  type ListTagsForResourceTarget,
} from "./listTagsForResource";

describe("ListTagsForResource target", () => {
  let listTagsForResource: ListTagsForResourceTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService({ Id: "test-pool" });
    (mockUserPoolService.options as any)._tags = {
      env: "production",
      team: "backend",
    };
    listTagsForResource = ListTagsForResource({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("returns stored tags", async () => {
    const result = await listTagsForResource(TestContext, {
      ResourceArn:
        "arn:aws:cognito-idp:us-east-1:123456789:userpool/test-pool",
    });

    expect(result.Tags).toEqual({
      env: "production",
      team: "backend",
    });
  });
});
