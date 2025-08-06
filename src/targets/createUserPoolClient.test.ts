import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import type { UserPoolService } from "../services";
import {
  CreateUserPoolClient,
  type CreateUserPoolClientTarget,
} from "./createUserPoolClient";

const originalDate = new Date();

describe("CreateUserPoolClient target", () => {
  let createUserPoolClient: CreateUserPoolClientTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    createUserPoolClient = CreateUserPoolClient({
      clock: new ClockFake(originalDate),
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("creates a new app client", async () => {
    const result = await createUserPoolClient(TestContext, {
      ClientName: "clientName",
      UserPoolId: "userPoolId",
    });

    expect(mockUserPoolService.saveAppClient).toHaveBeenCalledWith(
      TestContext,
      {
        ClientId: expect.any(String),
        ClientName: "clientName",
        CreationDate: originalDate,
        LastModifiedDate: originalDate,
        UserPoolId: "userPoolId",
        TokenValidityUnits: {
          AccessToken: "hours",
          IdToken: "minutes",
          RefreshToken: "days",
        },
      },
    );

    expect(result).toEqual({
      UserPoolClient: {
        ClientId: expect.any(String),
        ClientName: "clientName",
        CreationDate: originalDate,
        LastModifiedDate: originalDate,
        UserPoolId: "userPoolId",
        TokenValidityUnits: {
          AccessToken: "hours",
          IdToken: "minutes",
          RefreshToken: "days",
        },
      },
    });
  });
});
