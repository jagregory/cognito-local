import { type MockedObject, vi } from "vitest";
import type { Triggers } from "../services";

export const newMockTriggers = (): MockedObject<Triggers> => {
  const mock: MockedObject<Triggers> = {
    customMessage: vi.fn(),
    customEmailSender: vi.fn(),
    enabled: vi.fn(),
    forPool: vi.fn(),
    postAuthentication: vi.fn(),
    postConfirmation: vi.fn(),
    preSignUp: vi.fn(),
    preTokenGeneration: vi.fn(),
    userMigration: vi.fn(),
  };
  mock.forPool.mockReturnValue(mock);
  return mock;
};
