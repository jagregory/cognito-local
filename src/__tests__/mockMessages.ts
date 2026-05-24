import { type MockedObject, vi } from "vitest";
import type { Messages } from "../services";

export const newMockMessages = (): MockedObject<Messages> => {
  const mock: MockedObject<Messages> = {
    deliver: vi.fn(),
    forPool: vi.fn(),
  };
  mock.forPool.mockReturnValue(mock);
  return mock;
};
