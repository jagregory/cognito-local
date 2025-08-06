import fs from "node:fs";
import { promisify } from "node:util";
import StormDB from "stormdb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TestContext } from "../src/__tests__/testContext";
import type { DataStoreFactory } from "../src/services/dataStore/factory";
import { StormDBDataStoreFactory } from "../src/services/dataStore/stormDb";

const mkdtemp = promisify(fs.mkdtemp);
const readFile = promisify(fs.readFile);
const rm = promisify(fs.rm);

describe("Data Store", () => {
  let path: string;
  let factory: DataStoreFactory;

  beforeEach(async () => {
    path = await mkdtemp("/tmp/cognito-local:");
    factory = new StormDBDataStoreFactory(path);
  });

  afterEach(() =>
    rm(path, {
      recursive: true,
    }),
  );

  it("creates a named database", async () => {
    await factory.create(TestContext, "example", {});

    expect(fs.existsSync(`${path}/example.json`)).toBe(true);
  });

  it("creates a named database with the defaults persisted", async () => {
    await factory.create(TestContext, "example", { DefaultValue: true });

    expect(fs.existsSync(`${path}/example.json`)).toBe(true);

    const file = JSON.parse(await readFile(`${path}/example.json`, "utf-8"));
    expect(file).toEqual({
      DefaultValue: true,
    });
  });

  it("does not overwrite defaults if the file already exists", async () => {
    fs.writeFileSync(`${path}/example.json`, '{"Users":{"a":{"key":"value"}}}');

    await factory.create(TestContext, "example", { Users: {} });

    expect(fs.existsSync(`${path}/example.json`)).toBe(true);

    const file = JSON.parse(await readFile(`${path}/example.json`, "utf-8"));
    expect(file).toEqual({
      Users: {
        a: {
          key: "value",
        },
      },
    });
  });

  it("saves the default objects when a save occurs", async () => {
    const dataStore = await factory.create(TestContext, "example", {
      DefaultValue: true,
    });

    await dataStore.set(TestContext, "key", 1);

    const file = JSON.parse(await readFile(`${path}/example.json`, "utf-8"));
    expect(file).toEqual({
      DefaultValue: true,
      key: 1,
    });
  });

  describe("delete", () => {
    it("deletes a value", async () => {
      const dataStore = await factory.create(TestContext, "example", {});

      await dataStore.set(TestContext, "key1", 1);
      await dataStore.set(TestContext, "key2", 2);

      const fileBefore = JSON.parse(
        await readFile(`${path}/example.json`, "utf-8"),
      );

      expect(fileBefore).toEqual({
        key1: 1,
        key2: 2,
      });

      await dataStore.delete(TestContext, "key1");

      const fileAfter = JSON.parse(
        await readFile(`${path}/example.json`, "utf-8"),
      );

      expect(fileAfter).toEqual({
        key2: 2,
      });
    });

    it("deletes a nested value using array syntax", async () => {
      const dataStore = await factory.create(TestContext, "example", {});

      await dataStore.set(TestContext, ["key", "a", "b"], 1);
      await dataStore.set(TestContext, ["key", "a", "c"], 2);
      await dataStore.set(TestContext, "key2", 3);

      const fileBefore = JSON.parse(
        await readFile(`${path}/example.json`, "utf-8"),
      );

      expect(fileBefore).toEqual({
        key: {
          a: {
            b: 1,
            c: 2,
          },
        },
        key2: 3,
      });

      await dataStore.delete(TestContext, ["key", "a", "b"]);

      const fileAfter = JSON.parse(
        await readFile(`${path}/example.json`, "utf-8"),
      );

      expect(fileAfter).toEqual({
        key: {
          a: {
            c: 2,
          },
        },
        key2: 3,
      });
    });
  });

  describe("set", () => {
    it("saves a value", async () => {
      const dataStore = await factory.create(TestContext, "example", {});

      await dataStore.set(TestContext, "key1", 1);
      await dataStore.set(TestContext, "key2", 2);

      const file = JSON.parse(await readFile(`${path}/example.json`, "utf-8"));

      expect(file).toEqual({
        key1: 1,
        key2: 2,
      });
    });

    it("saves a date value", async () => {
      const dataStore = await factory.create(TestContext, "example", {});

      const date = new Date();

      await dataStore.set(TestContext, "SomethingDate", date);

      const file = JSON.parse(await readFile(`${path}/example.json`, "utf-8"));

      expect(file).toEqual({
        SomethingDate: date.toISOString(),
      });
    });

    it("fails to save a date value with the wrong type", async () => {
      const dataStore = await factory.create(TestContext, "example", {});

      const date = new Date();

      await expect(
        dataStore.set(TestContext, "SomethingDate", date.getTime()),
      ).rejects.toEqual(
        new Error(
          "Serialize: Expected SomethingDate field to contain a Date, received a number",
        ),
      );
    });

    it("saves a nested value using array syntax", async () => {
      const dataStore = await factory.create(TestContext, "example", {});

      await dataStore.set(TestContext, ["key", "a", "b"], 1);

      const file = JSON.parse(await readFile(`${path}/example.json`, "utf-8"));

      expect(file).toEqual({
        key: {
          a: {
            b: 1,
          },
        },
      });
    });

    it("saves a key with dots in as a single key-value pair", async () => {
      const dataStore = await factory.create(TestContext, "example", {});

      await dataStore.set(TestContext, "key.a.b", 1);

      const file = JSON.parse(await readFile(`${path}/example.json`, "utf-8"));

      expect(file).toEqual({
        "key.a.b": 1,
      });
    });

    it("replaces a value", async () => {
      const dataStore = await factory.create(TestContext, "example", {});

      await dataStore.set(TestContext, "key", 1);

      let file = JSON.parse(await readFile(`${path}/example.json`, "utf-8"));

      expect(file).toEqual({
        key: 1,
      });

      await dataStore.set(TestContext, "key", 2);

      file = JSON.parse(await readFile(`${path}/example.json`, "utf-8"));

      expect(file).toEqual({
        key: 2,
      });
    });
  });

  describe("getRoot", () => {
    it("returns entire db", async () => {
      const dataStore = await factory.create(TestContext, "example", {
        DefaultValue: true,
      });

      await dataStore.set(TestContext, "key", "value");

      const result = await dataStore.getRoot(TestContext);

      expect(result).toEqual({ DefaultValue: true, key: "value" });
    });
  });

  describe("get", () => {
    it("returns a default", async () => {
      const dataStore = await factory.create(TestContext, "example", {
        DefaultValue: true,
      });

      const result = await dataStore.get(TestContext, "DefaultValue");

      expect(result).toEqual(true);
    });

    it("returns null if key doesn't exist", async () => {
      const dataStore = await factory.create(TestContext, "example", {});

      const result = await dataStore.get(TestContext, "invalid");

      expect(result).toBeNull();
    });

    it("returns existing value", async () => {
      const dataStore = await factory.create(TestContext, "example", {});

      await dataStore.set(TestContext, "key", 1);

      const result = await dataStore.get(TestContext, "key");

      expect(result).toEqual(1);
    });

    it("returns a date value", async () => {
      const dataStore1 = await factory.create(TestContext, "example", {});

      const date = new Date();

      await dataStore1.set(TestContext, "SomethingDate", date);

      // use a separate datastore to avoid caching
      const dataStore2 = await factory.create(TestContext, "example", {});
      const result = await dataStore2.get(TestContext, "SomethingDate");

      expect(result).toEqual(date);
    });

    it("returns a date value stored as a number", async () => {
      // write the date as number directly with Storm, to avoid our validation of Date types
      const engine = new StormDB.localFileEngine(`${path}/example.json`, {
        async: true,
      });
      const db = new StormDB(engine);

      const date = new Date();

      db.set("SomethingDate", date.getTime());
      await db.save();

      const dataStore = await factory.create(TestContext, "example", {});
      const result = await dataStore.get(TestContext, "SomethingDate");

      expect(result).toEqual(date);
    });
  });
});
