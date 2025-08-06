import pino from "pino";
import type { Context } from "../services/context";
import { MockLogger } from "./mockLogger";

export const TestContext: Context = {
  logger: process.env.DEBUG
    ? pino({
        level: "debug",
      })
    : MockLogger,
};
