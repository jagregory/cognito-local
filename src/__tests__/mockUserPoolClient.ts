import { UserPoolClient } from "../services";

export const MockUserPoolClient = {
  config: {
    Id: "test",
  } as Record<string, string>,
  createAppClient: jest.fn() as jest.MockedFunction<
    UserPoolClient["createAppClient"]
  >,
  getUserByUsername: jest.fn() as jest.MockedFunction<
    UserPoolClient["getUserByUsername"]
  >,
  listUsers: jest.fn() as jest.MockedFunction<UserPoolClient["listUsers"]>,
  saveUser: jest.fn() as jest.MockedFunction<UserPoolClient["saveUser"]>,
  listGroups: jest.fn() as jest.MockedFunction<UserPoolClient["listGroups"]>,
  saveGroup: jest.fn() as jest.MockedFunction<UserPoolClient["saveGroup"]>,
};
