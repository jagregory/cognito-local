import StormDB from "stormdb";
import fs from "fs";
import { promisify } from "util";

const mkdir = promisify(fs.mkdir);

export interface DataStore {
  get<T>(key?: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}

export type CreateDataStore = (
  id: string,
  defaults: object,
  directory?: string
) => Promise<DataStore>;

export const createDataStore: CreateDataStore = async (
  id,
  defaults,
  directory = ".cognito/db"
): Promise<DataStore> => {
  await mkdir(directory, { recursive: true });
  const engine = new StormDB.localFileEngine(`${directory}/${id}.json`, {
    async: true,
    serialize: (obj: unknown) => JSON.stringify(obj, undefined, 2),
  });
  const db = new StormDB(engine);

  db.default(defaults);

  return {
    async get(key?: string) {
      if (!key) {
        return db.value();
      }

      const result = await db.get(key).value();

      return result ?? null;
    },

    async set(key, value) {
      await db.set(key, value).save();
    },
  };
};
