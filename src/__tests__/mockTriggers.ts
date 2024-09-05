import { Triggers } from "../services";

export const newMockTriggers = (): jest.Mocked<Triggers> => ({
  customMessage: jest.fn(),
  customEmailSender: jest.fn(),
  enabled: jest.fn(),
  postAuthentication: jest.fn(),
  postConfirmation: jest.fn(),
  preSignUp: jest.fn(),
  preTokenGenerationV1: jest.fn(),
  preTokenGenerationV2: jest.fn(),
  userMigration: jest.fn(),
});
