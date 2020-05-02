import { CreateDataStore, createDataStore } from "../src/services/dataStore";
import {
  createUserPoolClient,
  UserPoolClient,
} from "../src/services/userPoolClient";
import fs from "fs";
import { promisify } from "util";

const mkdtemp = promisify(fs.mkdtemp);
const readFile = promisify(fs.readFile);
const rmdir = promisify(fs.rmdir);

describe("User Pool", () => {
  let path: string;
  let tmpCreateDataStore: CreateDataStore;

  beforeEach(async () => {
    path = await mkdtemp("/tmp/cognito-local:");
    tmpCreateDataStore = (id, defaults) => createDataStore(id, defaults, path);
  });

  afterEach(() =>
    rmdir(path, {
      recursive: true,
    })
  );

  it("creates a database", async () => {
    await createUserPoolClient(
      { Id: "local", UsernameAttributes: [] },
      tmpCreateDataStore
    );

    expect(fs.existsSync(path + "/local.json")).toBe(true);
  });

  describe("saveUser", () => {
    it("saves a user with their username as an additional attribute", async () => {
      const now = new Date().getTime();
      const userPool = await createUserPoolClient(
        { Id: "local", UsernameAttributes: [] },
        tmpCreateDataStore
      );

      await userPool.saveUser({
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
        Options: { Id: "local", UsernameAttributes: [] },
        Users: {
          "1": {
            Username: "1",
            Password: "hunter3",
            UserStatus: "UNCONFIRMED",
            Attributes: [
              { Name: "sub", Value: "1" },
              { Name: "email", Value: "example@example.com" },
            ],
            UserLastModifiedDate: now,
            UserCreateDate: now,
            Enabled: true,
          },
        },
      });
    });

    it("updates a user", async () => {
      const now = new Date().getTime();
      const userPool = await createUserPoolClient(
        { Id: "local", UsernameAttributes: [] },
        tmpCreateDataStore
      );

      await userPool.saveUser({
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
        Options: { Id: "local", UsernameAttributes: [] },
        Users: {
          "1": {
            Username: "1",
            Password: "hunter3",
            UserStatus: "UNCONFIRMED",
            ConfirmationCode: "1234",
            Attributes: [
              { Name: "sub", Value: "1" },
              { Name: "email", Value: "example@example.com" },
            ],
            UserLastModifiedDate: now,
            UserCreateDate: now,
            Enabled: true,
          },
        },
      });

      await userPool.saveUser({
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
        Options: { Id: "local", UsernameAttributes: [] },
        Users: {
          "1": {
            Username: "1",
            Password: "hunter3",
            UserStatus: "CONFIRMED",
            Attributes: [
              { Name: "sub", Value: "1" },
              { Name: "email", Value: "example@example.com" },
            ],
            UserLastModifiedDate: now,
            UserCreateDate: now,
            Enabled: true,
          },
        },
      });
    });
  });

  describe("getUserByUsername", () => {
    let userPool: UserPoolClient;
    beforeAll(async () => {
      userPool = await createUserPoolClient(
        { Id: "local", UsernameAttributes: [] },
        tmpCreateDataStore
      );

      await userPool.saveUser({
        Username: "1",
        Password: "hunter2",
        UserStatus: "UNCONFIRMED",
        Attributes: [
          { Name: "email", Value: "example@example.com" },
          { Name: "phone_number", Value: "0411000111" },
        ],
        UserCreateDate: new Date().getTime(),
        UserLastModifiedDate: new Date().getTime(),
        Enabled: true,
      });
    });

    it("returns null if user doesn't exist", async () => {
      const user = await userPool.getUserByUsername("invalid");

      expect(user).toBeNull();
    });

    it("returns existing user by their sub attribute", async () => {
      const user = await userPool.getUserByUsername("1");

      expect(user).not.toBeNull();
      expect(user?.Username).toEqual("1");
    });
  });

  describe("listUsers", () => {
    let userPool: UserPoolClient;
    let now: Date;

    beforeAll(async () => {
      now = new Date();

      userPool = await createUserPoolClient(
        { Id: "local", UsernameAttributes: [] },
        tmpCreateDataStore
      );

      await userPool.saveUser({
        Username: "1",
        Password: "hunter2",
        UserStatus: "UNCONFIRMED",
        Attributes: [
          { Name: "email", Value: "example@example.com" },
          { Name: "phone_number", Value: "0411000111" },
        ],
        UserCreateDate: now.getTime(),
        UserLastModifiedDate: now.getTime(),
        Enabled: true,
      });

      await userPool.saveUser({
        Username: "2",
        Password: "password1",
        UserStatus: "UNCONFIRMED",
        Attributes: [],
        UserCreateDate: now.getTime(),
        UserLastModifiedDate: now.getTime(),
        Enabled: true,
      });
    });

    it("returns all users", async () => {
      const users = await userPool.listUsers();

      expect(users).toEqual([
        {
          Username: "1",
          Password: "hunter2",
          UserStatus: "UNCONFIRMED",
          Attributes: [
            { Name: "sub", Value: "1" },
            { Name: "email", Value: "example@example.com" },
            { Name: "phone_number", Value: "0411000111" },
          ],
          UserCreateDate: now.getTime(),
          UserLastModifiedDate: now.getTime(),
          Enabled: true,
        },
        {
          Username: "2",
          Password: "password1",
          UserStatus: "UNCONFIRMED",
          Attributes: [{ Name: "sub", Value: "2" }],
          UserCreateDate: now.getTime(),
          UserLastModifiedDate: now.getTime(),
          Enabled: true,
        },
      ]);
    });
  });
});
