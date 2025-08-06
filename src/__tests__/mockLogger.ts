import { vi } from "vitest";
import type { LogService } from "../services/LogService";

export const MockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  child() {
    return this;
  },
} as LogService;
