import { Triggers } from "../services";

export const newMockTriggers = (): jest.Mocked<Triggers> => ({
  customMessage: jest.fn(),
  enabled: jest.fn(),
  postAuthentication: jest.fn(),
  postConfirmation: jest.fn(),
  userMigration: jest.fn(),
});
