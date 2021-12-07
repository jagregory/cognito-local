import fs from "fs";
import StormDB from "stormdb";
import { promisify } from "util";
import { Context } from "../context";
import { DataStoreCache } from "./cache";
import { DataStore } from "./dataStore";
import { DataStoreFactory } from "./factory";

export class StormDBDataStore implements DataStore {
  private readonly db: StormDB;

  public constructor(db: StormDB) {
    this.db = db;
  }

  async delete(ctx: Context, key: string | string[]) {
    ctx.logger.debug({ key }, "DataStore.delete");
    (key instanceof Array ? key : [key])
      .reduce((acc, k) => acc.get(k), this.db)
      .delete(false);

    ctx.logger.debug({ store: this.db.value() }, "DataStore.save");
    await this.db.save();
  }

  async getRoot(ctx: Context) {
    ctx.logger.debug("DataStore.getRoot");
    return (await this.db.value()) ?? null;
  }

  async get<T>(ctx: Context, key: string | string[], defaultValue?: T) {
    ctx.logger.debug({ key }, "DataStore.get");
    return (
      (await (key instanceof Array ? key : [key])
        .reduce((acc, k) => acc.get([k]), this.db)
        .value()) ??
      defaultValue ??
      null
    );
  }

  async set<T>(ctx: Context, key: string | string[], value: T) {
    ctx.logger.debug({ key, value }, "DataStore.set");
    this.db.setValue(value, key instanceof Array ? key : [key]);
    ctx.logger.debug({ store: this.db.value() }, "DataStore.save");
    await this.db.save();
  }
}

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

const createStormDBInstance = (directory: string, id: string): StormDB => {
  const engine = new StormDB.localFileEngine(`${directory}/${id}.json`, {
    async: true,
    serialize: (obj: unknown) =>
      JSON.stringify(obj, replaceDatesWithISOStrings, 2),
    deserialize: (obj: string) => JSON.parse(obj, reviveDates),
  });

  return new StormDB(engine);
};

export class StormDBDataStoreFactory implements DataStoreFactory {
  private readonly directory: string;
  private readonly cache: DataStoreCache;

  public constructor(directory: string, dataStoreCache: DataStoreCache) {
    this.directory = directory;
    this.cache = dataStoreCache;
  }

  public async create(
    ctx: Context,
    id: string,
    defaults: object
  ): Promise<DataStore> {
    ctx.logger.debug({ id }, "createDataStore");
    await mkdir(this.directory, { recursive: true });

    const cachedDb = this.cache.get(id);
    if (cachedDb) {
      ctx.logger.debug({ id }, "Using cached data store");
      return cachedDb;
    }

    ctx.logger.debug({ id }, "Creating new data store");
    const db = createStormDBInstance(this.directory, id);

    db.default(defaults);

    ctx.logger.debug({ store: db.value() }, "DataStore.save");
    await db.save();

    const dataStore = new StormDBDataStore(db);

    this.cache.set(id, dataStore);

    return dataStore;
  }
}
