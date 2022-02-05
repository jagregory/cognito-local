import pino from "pino";

export type LogService = {
  child(bindings: pino.Bindings, options?: pino.ChildLoggerOptions): LogService;
  debug: pino.LogFn;
  error: pino.LogFn;
  info: pino.LogFn;
  warn: pino.LogFn;
};
