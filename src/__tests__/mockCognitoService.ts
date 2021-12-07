import { CognitoService, UserPoolService } from "../services";
import { CognitoServiceFactory } from "../services/cognitoService";
import { newMockUserPoolService } from "./mockUserPoolService";

export const newMockCognitoService = (
  userPoolClient: UserPoolService = newMockUserPoolService()
): jest.Mocked<CognitoService> => ({
  createUserPool: jest.fn(),
  getAppClient: jest.fn(),
  getUserPool: jest.fn().mockResolvedValue(userPoolClient),
  getUserPoolForClientId: jest.fn().mockResolvedValue(userPoolClient),
  listUserPools: jest.fn(),
});

export const newMockCognitoServiceFactory = (
  cognitoService: jest.Mocked<CognitoService> = newMockCognitoService()
): jest.Mocked<CognitoServiceFactory> => ({
  create: jest.fn().mockResolvedValue(cognitoService),
});
