import { Logger } from "../log";

export const MockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  child() {
    return this;
  },
} as Logger;
