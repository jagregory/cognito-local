import fs from "fs";
import StormDB from "stormdb";
import { promisify } from "util";
import { MockContext } from "../src/mocks/MockContext";
import { InMemoryCache, NoOpCache } from "../src/services/dataStore/cache";
import { DataStoreFactory } from "../src/services/dataStore/factory";
import { StormDBDataStoreFactory } from "../src/services/dataStore/stormDb";

const mkdtemp = promisify(fs.mkdtemp);
const readFile = promisify(fs.readFile);
const rmdir = promisify(fs.rmdir);

describe("Data Store", () => {
  let path: string;
  let factory: DataStoreFactory;

  beforeEach(async () => {
    path = await mkdtemp("/tmp/cognito-local:");
    factory = new StormDBDataStoreFactory(path, new NoOpCache());
  });

  afterEach(() =>
    rmdir(path, {
      recursive: true,
    })
  );

  it("creates a named database", async () => {
    await factory.create(MockContext, "example", {});

    expect(fs.existsSync(path + "/example.json")).toBe(true);
  });

  it("creates a named database with the defaults persisted", async () => {
    await factory.create(MockContext, "example", { DefaultValue: true });

    expect(fs.existsSync(path + "/example.json")).toBe(true);

    const file = JSON.parse(await readFile(path + "/example.json", "utf-8"));
    expect(file).toEqual({
      DefaultValue: true,
    });
  });

  it("does not overwrite defaults if the file already exists", async () => {
    fs.writeFileSync(path + "/example.json", '{"Users":{"a":{"key":"value"}}}');

    await factory.create(MockContext, "example", { Users: {} });

    expect(fs.existsSync(path + "/example.json")).toBe(true);

    const file = JSON.parse(await readFile(path + "/example.json", "utf-8"));
    expect(file).toEqual({
      Users: {
        a: {
          key: "value",
        },
      },
    });
  });

  it("saves the default objects when a save occurs", async () => {
    const dataStore = await factory.create(MockContext, "example", {
      DefaultValue: true,
    });

    await dataStore.set(MockContext, "key", 1);

    const file = JSON.parse(await readFile(path + "/example.json", "utf-8"));
    expect(file).toEqual({
      DefaultValue: true,
      key: 1,
    });
  });

  describe("delete", () => {
    it("deletes a value", async () => {
      const dataStore = await factory.create(MockContext, "example", {});

      await dataStore.set(MockContext, "key1", 1);
      await dataStore.set(MockContext, "key2", 2);

      const fileBefore = JSON.parse(
        await readFile(path + "/example.json", "utf-8")
      );

      expect(fileBefore).toEqual({
        key1: 1,
        key2: 2,
      });

      await dataStore.delete(MockContext, "key1");

      const fileAfter = JSON.parse(
        await readFile(path + "/example.json", "utf-8")
      );

      expect(fileAfter).toEqual({
        key2: 2,
      });
    });

    it("deletes a nested value using array syntax", async () => {
      const dataStore = await factory.create(MockContext, "example", {});

      await dataStore.set(MockContext, ["key", "a", "b"], 1);
      await dataStore.set(MockContext, ["key", "a", "c"], 2);
      await dataStore.set(MockContext, "key2", 3);

      const fileBefore = JSON.parse(
        await readFile(path + "/example.json", "utf-8")
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

      await dataStore.delete(MockContext, ["key", "a", "b"]);

      const fileAfter = JSON.parse(
        await readFile(path + "/example.json", "utf-8")
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
      const dataStore = await factory.create(MockContext, "example", {});

      await dataStore.set(MockContext, "key1", 1);
      await dataStore.set(MockContext, "key2", 2);

      const file = JSON.parse(await readFile(path + "/example.json", "utf-8"));

      expect(file).toEqual({
        key1: 1,
        key2: 2,
      });
    });

    it("saves a date value", async () => {
      const dataStore = await factory.create(MockContext, "example", {});

      const date = new Date();

      await dataStore.set(MockContext, "SomethingDate", date);

      const file = JSON.parse(await readFile(path + "/example.json", "utf-8"));

      expect(file).toEqual({
        SomethingDate: date.toISOString(),
      });
    });

    it("fails to save a date value with the wrong type", async () => {
      const dataStore = await factory.create(MockContext, "example", {});

      const date = new Date();

      await expect(
        dataStore.set(MockContext, "SomethingDate", date.getTime())
      ).rejects.toEqual(
        new Error(
          "Serialize: Expected SomethingDate field to contain a Date, received a number"
        )
      );
    });

    it("saves a nested value using array syntax", async () => {
      const dataStore = await factory.create(MockContext, "example", {});

      await dataStore.set(MockContext, ["key", "a", "b"], 1);

      const file = JSON.parse(await readFile(path + "/example.json", "utf-8"));

      expect(file).toEqual({
        key: {
          a: {
            b: 1,
          },
        },
      });
    });

    it("saves a key with dots in as a single key-value pair", async () => {
      const dataStore = await factory.create(MockContext, "example", {});

      await dataStore.set(MockContext, "key.a.b", 1);

      const file = JSON.parse(await readFile(path + "/example.json", "utf-8"));

      expect(file).toEqual({
        "key.a.b": 1,
      });
    });

    it("replaces a value", async () => {
      const dataStore = await factory.create(MockContext, "example", {});

      await dataStore.set(MockContext, "key", 1);

      let file = JSON.parse(await readFile(path + "/example.json", "utf-8"));

      expect(file).toEqual({
        key: 1,
      });

      await dataStore.set(MockContext, "key", 2);

      file = JSON.parse(await readFile(path + "/example.json", "utf-8"));

      expect(file).toEqual({
        key: 2,
      });
    });
  });

  describe("getRoot", () => {
    it("returns entire db", async () => {
      const dataStore = await factory.create(MockContext, "example", {
        DefaultValue: true,
      });

      await dataStore.set(MockContext, "key", "value");

      const result = await dataStore.getRoot(MockContext);

      expect(result).toEqual({ DefaultValue: true, key: "value" });
    });
  });

  describe("get", () => {
    it("returns a default", async () => {
      const dataStore = await factory.create(MockContext, "example", {
        DefaultValue: true,
      });

      const result = await dataStore.get(MockContext, "DefaultValue");

      expect(result).toEqual(true);
    });

    it("returns null if key doesn't exist", async () => {
      const dataStore = await factory.create(MockContext, "example", {});

      const result = await dataStore.get(MockContext, "invalid");

      expect(result).toBeNull();
    });

    it("returns existing value", async () => {
      const dataStore = await factory.create(MockContext, "example", {});

      await dataStore.set(MockContext, "key", 1);

      const result = await dataStore.get(MockContext, "key");

      expect(result).toEqual(1);
    });

    it("returns a date value", async () => {
      const dataStore1 = await factory.create(MockContext, "example", {});

      const date = new Date();

      await dataStore1.set(MockContext, "SomethingDate", date);

      // use a separate datastore to avoid caching
      const dataStore2 = await factory.create(MockContext, "example", {});
      const result = await dataStore2.get(MockContext, "SomethingDate");

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

      const dataStore = await factory.create(MockContext, "example", {});
      const result = await dataStore.get(MockContext, "SomethingDate");

      expect(result).toEqual(date);
    });

    it("supports caching data stores across creates for the same id", async () => {
      const factory = new StormDBDataStoreFactory(path, new InMemoryCache());

      const dataStore1 = await factory.create(MockContext, "example", {});
      const dataStore2 = await factory.create(MockContext, "example", {});
      const dataStore3 = await factory.create(MockContext, "example2", {});

      await dataStore1.set(MockContext, "One", 1);
      await dataStore2.set(MockContext, "Two", 2);
      await dataStore3.set(MockContext, "Three", 3);

      expect(await dataStore1.getRoot(MockContext)).toEqual({
        One: 1,
        Two: 2,
      });
      expect(await dataStore2.getRoot(MockContext)).toEqual({
        One: 1,
        Two: 2,
      });
      expect(await dataStore3.getRoot(MockContext)).toEqual({
        Three: 3,
      });
    });
  });
});
