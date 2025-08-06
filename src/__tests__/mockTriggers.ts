import { type MockedObject, vi } from "vitest";
import type { Triggers } from "../services";

export const newMockTriggers = (): MockedObject<Triggers> => ({
  customMessage: vi.fn(),
  customEmailSender: vi.fn(),
  enabled: vi.fn(),
  postAuthentication: vi.fn(),
  postConfirmation: vi.fn(),
  preSignUp: vi.fn(),
  preTokenGeneration: vi.fn(),
  userMigration: vi.fn(),
});
