import { type MockedObject, vi } from "vitest";
import type { SessionService } from "../services";

export const newMockSessionService = (): MockedObject<SessionService> => ({
  consume: vi.fn(),
  create: vi.fn(),
  get: vi.fn(),
  rotate: vi.fn(),
});
