import { type MockedObject, vi } from "vitest";
import type { Triggers } from "../services";

export const newMockTriggers = (): MockedObject<Triggers> => ({
  createAuthChallenge: vi.fn(),
  customMessage: vi.fn(),
  customEmailSender: vi.fn(),
  defineAuthChallenge: vi.fn(),
  enabled: vi.fn(),
  postAuthentication: vi.fn(),
  postConfirmation: vi.fn(),
  preSignUp: vi.fn(),
  preTokenGeneration: vi.fn(),
  userMigration: vi.fn(),
  verifyAuthChallengeResponse: vi.fn(),
});
