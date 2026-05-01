import { type MockedObject, vi } from "vitest";
import type { TokenGenerator } from "../services/tokenGenerator";

export const newMockTokenGenerator = (): MockedObject<TokenGenerator> => {
  const mock: MockedObject<TokenGenerator> = {
    forPool: vi.fn(),
    generate: vi.fn(),
  };
  mock.forPool.mockReturnValue(mock);
  return mock;
};
