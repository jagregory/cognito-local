import fs from "fs";
import StormDB from "stormdb";
import { promisify } from "util";
import { Context } from "./context";

const mkdir = promisify(fs.mkdir);

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

export interface DataStore {
  delete(ctx: Context, key: string | string[]): Promise<void>;
  get<T>(ctx: Context, key: string | string[]): Promise<T | null>;
  get<T>(ctx: Context, key: string | string[], defaultValue: T): Promise<T>;
  getRoot<T>(ctx: Context): Promise<T | null>;
  set<T>(ctx: Context, key: string | string[], value: T): Promise<void>;
}

export type CreateDataStore = (
  ctx: Context,
  id: string,
  defaults: object,
  directory: string
) => Promise<DataStore>;

export const createDataStore: CreateDataStore = async (
  ctx,
  id,
  defaults,
  directory
): Promise<DataStore> => {
  ctx.logger.debug({ id }, "createDataStore");
  await mkdir(directory, { recursive: true });

  const engine = new StormDB.localFileEngine(`${directory}/${id}.json`, {
    async: true,
    serialize: (obj: unknown) =>
      JSON.stringify(obj, replaceDatesWithISOStrings, 2),
    deserialize: (obj: string) => JSON.parse(obj, reviveDates),
  });
  const db = new StormDB(engine);

  db.default(defaults);

  ctx.logger.debug({ store: db.value() }, "DataStore.save");
  await db.save();

  return {
    async delete(ctx, key) {
      ctx.logger.debug({ key }, "DataStore.delete");
      (key instanceof Array ? key : [key])
        .reduce((acc, k) => acc.get(k), db)
        .delete(false);

      ctx.logger.debug({ store: db.value() }, "DataStore.save");
      await db.save();
    },

    async getRoot(ctx) {
      ctx.logger.debug("DataStore.getRoot");
      return (await db.value()) ?? null;
    },

    async get<T>(ctx: Context, key: string | string[], defaultValue?: T) {
      ctx.logger.debug({ key }, "DataStore.get");
      return (
        (await (key instanceof Array ? key : [key])
          .reduce((acc, k) => acc.get([k]), db)
          .value()) ??
        defaultValue ??
        null
      );
    },

    async set(ctx, key, value) {
      ctx.logger.debug({ key, value }, "DataStore.set");
      db.setValue(value, key instanceof Array ? key : [key]);
      ctx.logger.debug({ store: db.value() }, "DataStore.save");
      await db.save();
    },
  };
};
