import { Context } from "../services/context";
import { MockLogger } from "./mockLogger";
import pino from "pino";

export const TestContext: Context = {
  logger: process.env["DEBUG"]
    ? pino({
        level: "debug",
      })
    : MockLogger,
};
