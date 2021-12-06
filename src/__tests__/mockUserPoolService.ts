import { UserPoolService } from "../services";

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
