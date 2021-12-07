import { UserPoolService } from "../services";
import { UserPoolServiceFactory } from "../services/userPoolService";

export const newMockUserPoolService = (): jest.Mocked<UserPoolService> => ({
  config: {
    Id: "test",
  },
  createAppClient: jest.fn(),
  deleteUser: jest.fn(),
  getUserByRefreshToken: jest.fn(),
  getUserByUsername: jest.fn(),
  listGroups: jest.fn(),
  listUsers: jest.fn(),
  saveGroup: jest.fn(),
  saveUser: jest.fn(),
  storeRefreshToken: jest.fn(),
});

export const newMockUserPoolServiceFactory = (
  cognitoService: jest.Mocked<UserPoolService> = newMockUserPoolService()
): jest.Mocked<UserPoolServiceFactory> => ({
  create: jest.fn().mockResolvedValue(cognitoService),
});
