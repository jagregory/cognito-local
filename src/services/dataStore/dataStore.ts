import { Context } from "../context";

export interface DataStore {
  delete(ctx: Context, key: string | string[]): Promise<void>;
  get<T>(ctx: Context, key: string | string[]): Promise<T | null>;
  get<T>(ctx: Context, key: string | string[], defaultValue: T): Promise<T>;
  getRoot<T>(ctx: Context): Promise<T | null>;
  set<T>(ctx: Context, key: string | string[], value: T): Promise<void>;
}
