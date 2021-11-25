import fs from "fs";
import StormDB from "stormdb";
import { promisify } from "util";

const mkdir = promisify(fs.mkdir);

export interface DataStore {
  delete(key: string | string[]): Promise<void>;
  get<T>(key: string | string[]): Promise<T | null>;
  get<T>(key: string | string[], defaultValue: T): Promise<T>;
  getRoot<T>(): Promise<T | null>;
  set<T>(key: string | string[], value: T): Promise<void>;
}

export type CreateDataStore = (
  id: string,
  defaults: object,
  directory: string
) => Promise<DataStore>;

export const createDataStore: CreateDataStore = async (
  id,
  defaults,
  directory
): Promise<DataStore> => {
  await mkdir(directory, { recursive: true });
  const engine = new StormDB.localFileEngine(`${directory}/${id}.json`, {
    async: true,
    serialize: (obj: unknown) => JSON.stringify(obj, undefined, 2),
  });
  const db = new StormDB(engine);

  db.default(defaults);

  return {
    async delete(key: string | string[]) {
      (key instanceof Array ? key : [key])
        .reduce((acc, k) => acc.get(k), db)
        .delete();
      await db.save();
    },

    async getRoot() {
      return (await db.value()) ?? null;
    },

    async get(key: string | string[], defaultValue?: unknown) {
      return (
        (await (key instanceof Array ? key : [key])
          .reduce((acc, k) => acc.get([k]), db)
          .value()) ??
        defaultValue ??
        null
      );
    },

    async set(key, value) {
      db.setValue(value, key instanceof Array ? key : [key]);
      await db.save();
    },
  };
};
