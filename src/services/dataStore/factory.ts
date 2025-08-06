import type { Context } from "../context";
import type { DataStore } from "./dataStore";

export interface DataStoreFactory {
  create(ctx: Context, id: string, defaults: object): Promise<DataStore>;
}
