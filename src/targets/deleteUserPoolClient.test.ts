import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { ResourceNotFoundError } from "../errors";
import type { CognitoService, UserPoolService } from "../services";
import {
  DeleteUserPoolClient,
  type DeleteUserPoolClientTarget,
} from "./deleteUserPoolClient";

describe("DeleteUserPoolClient target", () => {
  let deleteUserPoolClient: DeleteUserPoolClientTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;
  let mockCognitoService: MockedObject<CognitoService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    mockCognitoService = newMockCognitoService(mockUserPoolService);

    deleteUserPoolClient = DeleteUserPoolClient({
      cognito: mockCognitoService,
    });
  });

  it("deletes a user pool client", async () => {
    const existingAppClient = TDB.appClient({
      UserPoolId: "test",
    });

    mockCognitoService.getAppClient.mockResolvedValue(existingAppClient);

    await deleteUserPoolClient(TestContext, {
      ClientId: existingAppClient.ClientId,
      UserPoolId: "test",
    });

    expect(mockUserPoolService.deleteAppClient).toHaveBeenCalledWith(
      TestContext,
      existingAppClient,
    );
  });

  it("throws if the user pool client doesn't exist", async () => {
    mockCognitoService.getAppClient.mockResolvedValue(null);

    await expect(
      deleteUserPoolClient(TestContext, {
        ClientId: "clientId",
        UserPoolId: "test",
      }),
    ).rejects.toEqual(new ResourceNotFoundError());
  });

  it("throws if the user pool client UserPoolId doesn't match the request", async () => {
    const existingAppClient = TDB.appClient({
      ClientId: "clientId",
      UserPoolId: "pool-one",
    });

    mockCognitoService.getAppClient.mockResolvedValue(existingAppClient);

    await expect(
      deleteUserPoolClient(TestContext, {
        ClientId: "clientId",
        UserPoolId: "pool-two",
      }),
    ).rejects.toEqual(new ResourceNotFoundError());
  });
});
