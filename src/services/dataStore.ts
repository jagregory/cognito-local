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

  const replaceDatesWithISOStrings: (
    this: Record<string, unknown>,
    key: string,
    value: unknown
  ) => unknown = function (key, value) {
    if (!key.endsWith("Date")) {
      return value;
    }

    const val = this[key];
    if (!(val instanceof Date)) {
      throw new Error(
        `Serialize: Expected ${key} field to contain a Date, received a ${typeof this[
          key
        ]}`
      );
    }

    return val.toISOString();
  };
  const reviveDates = (key: string, value: unknown): unknown => {
    if (!key.endsWith("Date")) {
      return value;
    }
    if (typeof value === "number") {
      return new Date(value);
    }
    if (typeof value === "string") {
      return new Date(Date.parse(value));
    }

    throw new Error(
      `Deserialize: Expected ${key} to contain a String or Number, received a ${typeof value}`
    );
  };

  const engine = new StormDB.localFileEngine(`${directory}/${id}.json`, {
    async: true,
    serialize: (obj: unknown) =>
      JSON.stringify(obj, replaceDatesWithISOStrings, 2),
    deserialize: (obj: string) => JSON.parse(obj, reviveDates),
  });
  const db = new StormDB(engine);

  db.default(defaults);
  await db.save();

  return {
    async delete(key: string | string[]) {
      (key instanceof Array ? key : [key])
        .reduce((acc, k) => acc.get(k), db)
        .delete(false);
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
