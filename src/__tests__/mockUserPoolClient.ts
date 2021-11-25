import { UserPoolClient } from "../services";

export const MockUserPoolClient = {
  config: {
    Id: "test",
  } as Record<string, string>,
  createAppClient: jest.fn() as jest.MockedFunction<
    UserPoolClient["createAppClient"]
  >,
  deleteUser: jest.fn() as jest.MockedFunction<UserPoolClient["deleteUser"]>,
  getUserByUsername: jest.fn() as jest.MockedFunction<
    UserPoolClient["getUserByUsername"]
  >,
  listGroups: jest.fn() as jest.MockedFunction<UserPoolClient["listGroups"]>,
  listUsers: jest.fn() as jest.MockedFunction<UserPoolClient["listUsers"]>,
  saveGroup: jest.fn() as jest.MockedFunction<UserPoolClient["saveGroup"]>,
  saveUser: jest.fn() as jest.MockedFunction<UserPoolClient["saveUser"]>,
};
