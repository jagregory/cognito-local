import { Triggers } from "../services";

export const newMockTriggers = (): jest.Mocked<Triggers> => ({
  enabled: jest.fn(),
  customMessage: jest.fn(),
  postConfirmation: jest.fn(),
  userMigration: jest.fn(),
});
