import { type MockedObject, vi } from "vitest";
import type { CognitoService, UserPoolService } from "../services";
import type { CognitoServiceFactory } from "../services/cognitoService";
import { newMockUserPoolService } from "./mockUserPoolService";

export const newMockCognitoService = (
  userPoolClient: UserPoolService = newMockUserPoolService(),
): MockedObject<CognitoService> => ({
  createUserPool: vi.fn(),
  deleteUserPool: vi.fn(),
  getAppClient: vi.fn(),
  getUserPool: vi.fn().mockResolvedValue(userPoolClient),
  getUserPoolForClientId: vi.fn().mockResolvedValue(userPoolClient),
  listAppClients: vi.fn(),
  listUserPools: vi.fn(),
});

export const newMockCognitoServiceFactory = (
  cognitoService: MockedObject<CognitoService> = newMockCognitoService(),
): MockedObject<CognitoServiceFactory> => ({
  create: vi.fn().mockResolvedValue(cognitoService),
});
