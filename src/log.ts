import debug from "debug";

export interface Logger {
  debug(message?: any, ...optionalParams: any[]): void;
  error(message?: any, ...optionalParams: any[]): void;
  info(message?: any, ...optionalParams: any[]): void;
}

const logger = debug("CognitoLocal");

export class ConsoleLogger implements Logger {
  info = console.info;
  error = console.error;

  debug(...args: any[]) {
    if (logger.enabled) {
      logger.log(...args);
    }
  }
}
