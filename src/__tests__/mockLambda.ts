import { type MockedObject, vi } from "vitest";
import type { Lambda } from "../services";

export const newMockLambda = (): MockedObject<Lambda> => ({
  enabled: vi.fn(),
  // biome-ignore lint/suspicious/noExplicitAny: overloaded function
  invoke: vi.fn() as any,
});
