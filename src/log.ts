import pino from "pino";

export type Logger = {
  child(bindings: pino.Bindings, options?: pino.ChildLoggerOptions): Logger;
  debug: pino.LogFn;
  error: pino.LogFn;
  info: pino.LogFn;
  warn: pino.LogFn;
};
