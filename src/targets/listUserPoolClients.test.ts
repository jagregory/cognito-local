import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import type { CognitoService } from "../services";
import {
  ListUserPoolClients,
  type ListUserPoolClientsTarget,
} from "./listUserPoolClients";

describe("ListUserPoolClients target", () => {
  let mockCognitoService: MockedObject<CognitoService>;
  let listUserPoolClients: ListUserPoolClientsTarget;

  beforeEach(() => {
    mockCognitoService = newMockCognitoService(newMockUserPoolService());
    listUserPoolClients = ListUserPoolClients({
      cognito: mockCognitoService,
    });
  });

  it("lists user pool clients", async () => {
    const appClient1 = TDB.appClient();
    const appClient2 = TDB.appClient();

    mockCognitoService.listAppClients.mockResolvedValue([
      appClient1,
      appClient2,
    ]);

    const output = await listUserPoolClients(TestContext, {
      UserPoolId: "userPoolId",
    });

    expect(output).toBeDefined();
    expect(output.UserPoolClients).toEqual([appClient1, appClient2]);
  });
});
