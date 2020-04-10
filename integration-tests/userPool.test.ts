import { createUserPool } from "../src/services/userPool";
import fs from "fs";
import { promisify } from "util";

const mkdtemp = promisify(fs.mkdtemp);
const readFile = promisify(fs.readFile);
const rmdir = promisify(fs.rmdir);

describe("User Pool", () => {
  let path: string;

  beforeEach(async () => {
    path = await mkdtemp("/tmp/cognito-local:");
  });

  afterEach(() =>
    rmdir(path, {
      recursive: true,
    })
  );

  it("creates a database", async () => {
    await createUserPool({ UsernameAttributes: [] }, path);

    expect(fs.existsSync(path + "/local.json")).toBe(true);
  });

  describe("saveUser", () => {
    it("saves a user", async () => {
      const now = new Date().getTime();
      const dataStore = await createUserPool({ UsernameAttributes: [] }, path);

      await dataStore.saveUser({
        Username: "1",
        Password: "hunter3",
        UserStatus: "UNCONFIRMED",
        Attributes: [{ Name: "email", Value: "example@example.com" }],
        UserLastModifiedDate: now,
        UserCreateDate: now,
        Enabled: true,
      });

      const file = JSON.parse(await readFile(path + "/local.json", "utf-8"));

      expect(file).toEqual({
        Options: { UsernameAttributes: [] },
        Users: {
          "1": {
            Username: "1",
            Password: "hunter3",
            UserStatus: "UNCONFIRMED",
            Attributes: [{ Name: "email", Value: "example@example.com" }],
            UserLastModifiedDate: now,
            UserCreateDate: now,
            Enabled: true,
          },
        },
      });
    });

    it("updates a user", async () => {
      const now = new Date().getTime();
      const dataStore = await createUserPool({ UsernameAttributes: [] }, path);

      await dataStore.saveUser({
        Username: "1",
        Password: "hunter3",
        UserStatus: "UNCONFIRMED",
        ConfirmationCode: "1234",
        Attributes: [{ Name: "email", Value: "example@example.com" }],
        UserLastModifiedDate: now,
        UserCreateDate: now,
        Enabled: true,
      });

      let file = JSON.parse(await readFile(path + "/local.json", "utf-8"));

      expect(file).toEqual({
        Options: { UsernameAttributes: [] },
        Users: {
          "1": {
            Username: "1",
            Password: "hunter3",
            UserStatus: "UNCONFIRMED",
            ConfirmationCode: "1234",
            Attributes: [{ Name: "email", Value: "example@example.com" }],
            UserLastModifiedDate: now,
            UserCreateDate: now,
            Enabled: true,
          },
        },
      });

      await dataStore.saveUser({
        Username: "1",
        Password: "hunter3",
        UserStatus: "CONFIRMED",
        Attributes: [{ Name: "email", Value: "example@example.com" }],
        UserLastModifiedDate: now,
        UserCreateDate: now,
        Enabled: true,
      });

      file = JSON.parse(await readFile(path + "/local.json", "utf-8"));

      expect(file).toEqual({
        Options: { UsernameAttributes: [] },
        Users: {
          "1": {
            Username: "1",
            Password: "hunter3",
            UserStatus: "CONFIRMED",
            Attributes: [{ Name: "email", Value: "example@example.com" }],
            UserLastModifiedDate: now,
            UserCreateDate: now,
            Enabled: true,
          },
        },
      });
    });
  });

  describe("getUserByUsername", () => {
    it("returns null if user doesn't exist", async () => {
      const dataStore = await createUserPool({ UsernameAttributes: [] }, path);

      const user = await dataStore.getUserByUsername("invalid");

      expect(user).toBeNull();
    });

    it("returns existing user", async () => {
      const dataStore = await createUserPool({ UsernameAttributes: [] }, path);

      await dataStore.saveUser({
        Username: "1",
        Password: "hunter2",
        UserStatus: "UNCONFIRMED",
        Attributes: [],
        UserCreateDate: new Date().getTime(),
        UserLastModifiedDate: new Date().getTime(),
        Enabled: true,
      });

      const user = await dataStore.getUserByUsername("janice");

      expect(user).not.toBeNull();
      expect(user?.Username).toEqual("1");
    });
  });
});
