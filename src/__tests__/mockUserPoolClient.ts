import { UserPoolClient } from "../services";

export const newMockUserPoolClient = (): jest.Mocked<UserPoolClient> => ({
  config: {
    Id: "test",
  },
  createAppClient: jest.fn(),
  deleteUser: jest.fn(),
  getUserByUsername: jest.fn(),
  listGroups: jest.fn(),
  listUsers: jest.fn(),
  saveGroup: jest.fn(),
  saveUser: jest.fn(),
});
