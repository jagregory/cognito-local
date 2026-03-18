import { type MockedObject, vi } from "vitest";
import type { Lambda } from "../services";

export const newMockLambda = (): MockedObject<Lambda> => {
  const mock: MockedObject<Lambda> = {
    enabled: vi.fn(),
    forPool: vi.fn(),
    // biome-ignore lint/suspicious/noExplicitAny: overloaded function
    invoke: vi.fn() as any,
  };
  mock.forPool.mockReturnValue(mock);
  return mock;
};
