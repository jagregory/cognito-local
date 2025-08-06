import { type MockedObject, vi } from "vitest";
import type { UserPoolService } from "../services";
import type {
  UserPool,
  UserPoolServiceFactory,
} from "../services/userPoolService";

export const newMockUserPoolService = (
  config: UserPool = {
    Id: "test",
  },
): MockedObject<UserPoolService> => ({
  addUserToGroup: vi.fn(),
  deleteAppClient: vi.fn(),
  deleteGroup: vi.fn(),
  deleteUser: vi.fn(),
  getGroupByGroupName: vi.fn(),
  getUserByRefreshToken: vi.fn(),
  getUserByUsername: vi.fn(),
  listGroups: vi.fn(),
  listUserGroupMembership: vi.fn(),
  listUsers: vi.fn(),
  options: config,
  removeUserFromGroup: vi.fn(),
  saveAppClient: vi.fn(),
  saveGroup: vi.fn(),
  saveUser: vi.fn(),
  storeRefreshToken: vi.fn(),
  updateOptions: vi.fn(),
});

export const newMockUserPoolServiceFactory = (
  cognitoService: MockedObject<UserPoolService> = newMockUserPoolService(),
): MockedObject<UserPoolServiceFactory> => ({
  create: vi.fn().mockResolvedValue(cognitoService),
});
