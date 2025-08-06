import { type MockedObject, vi } from "vitest";
import type { TokenGenerator } from "../services/tokenGenerator";

export const newMockTokenGenerator = (): MockedObject<TokenGenerator> => ({
  generate: vi.fn(),
});
