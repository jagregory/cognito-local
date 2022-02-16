import { UserPoolService } from "../services";
import { UserPool, UserPoolServiceFactory } from "../services/userPoolService";

export const newMockUserPoolService = (
  config: UserPool = {
    Id: "test",
  }
): jest.Mocked<UserPoolService> => ({
  config,
  createAppClient: jest.fn(),
  deleteGroup: jest.fn(),
  deleteUser: jest.fn(),
  getGroupByGroupName: jest.fn(),
  getUserByRefreshToken: jest.fn(),
  getUserByUsername: jest.fn(),
  listGroups: jest.fn(),
  listUsers: jest.fn(),
  removeUserFromGroup: jest.fn(),
  saveGroup: jest.fn(),
  saveUser: jest.fn(),
  storeRefreshToken: jest.fn(),
});

export const newMockUserPoolServiceFactory = (
  cognitoService: jest.Mocked<UserPoolService> = newMockUserPoolService()
): jest.Mocked<UserPoolServiceFactory> => ({
  create: jest.fn().mockResolvedValue(cognitoService),
});
