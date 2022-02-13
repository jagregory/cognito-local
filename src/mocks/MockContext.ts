import { Context } from "../services/context";
import { MockLogger } from "./MockLogger";

export const MockContext: Context = {
  logger: MockLogger,
};
