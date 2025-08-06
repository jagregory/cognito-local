import type { LogService } from "./LogService";
export interface Context {
  readonly logger: LogService;
}
