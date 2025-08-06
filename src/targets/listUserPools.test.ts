import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import type { CognitoService } from "../services";
import { ListUserPools, type ListUserPoolsTarget } from "./listUserPools";

describe("ListUserPools target", () => {
  let listUserPools: ListUserPoolsTarget;
  let mockCognitoService: MockedObject<CognitoService>;

  beforeEach(() => {
    mockCognitoService = newMockCognitoService(newMockUserPoolService());
    listUserPools = ListUserPools({
      cognito: mockCognitoService,
    });
  });

  it("lists user pools", async () => {
    const userPool1 = TDB.userPool();
    const userPool2 = TDB.userPool();

    mockCognitoService.listUserPools.mockResolvedValue([userPool1, userPool2]);

    const output = await listUserPools(TestContext, {
      MaxResults: 10,
    });

    expect(output).toBeDefined();
    expect(output.UserPools).toEqual([userPool1, userPool2]);
  });
});
