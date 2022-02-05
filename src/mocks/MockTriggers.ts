import { Triggers } from "../services";

export const MockTriggers = (): jest.Mocked<Triggers> => ({
  customMessage: jest.fn(),
  enabled: jest.fn(),
  postAuthentication: jest.fn(),
  postConfirmation: jest.fn(),
  preSignUp: jest.fn(),
  preTokenGeneration: jest.fn(),
  userMigration: jest.fn(),
});
