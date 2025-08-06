import { type MockedObject, vi } from "vitest";
import type { Messages } from "../services";

export const newMockMessages = (): MockedObject<Messages> => ({
  deliver: vi.fn(),
});
