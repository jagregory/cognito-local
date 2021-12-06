import fs from "fs";
import { promisify } from "util";
import { MockLogger } from "../src/__tests__/mockLogger";
import {
  CognitoService,
  CognitoServiceImpl,
  DateClock,
  UserPoolService,
  UserPoolServiceImpl,
} from "../src/services";
import { createDataStore } from "../src/services/dataStore";

const mkdtemp = promisify(fs.mkdtemp);
const readFile = promisify(fs.readFile);
const rmdir = promisify(fs.rmdir);

const validUsernameExamples = ["ExampleUsername", "example.username"];

describe("User Pool Service", () => {
  let dataDirectory: string;
  let cognitoClient: CognitoService;

  beforeEach(async () => {
    dataDirectory = await mkdtemp("/tmp/cognito-local:");
    cognitoClient = await CognitoServiceImpl.create(
      dataDirectory,
      {},
      new DateClock(),
      createDataStore,
      UserPoolServiceImpl.create,
      MockLogger
    );
  });

  afterEach(() =>
    rmdir(dataDirectory, {
      recursive: true,
    })
  );

  it("creates a database", async () => {
    await cognitoClient.getUserPool("local");

    expect(fs.existsSync(dataDirectory + "/local.json")).toBe(true);
  });

  describe("saveUser", () => {
    describe.each(validUsernameExamples)("with username %s", (username) => {
      it("saves the user", async () => {
        const now = new Date();
        const userPool = await cognitoClient.getUserPool("local");

        await userPool.saveUser({
          Username: username,
          Password: "hunter3",
          UserStatus: "UNCONFIRMED",
          Attributes: [
            { Name: "sub", Value: "uuid-1234" },
            { Name: "email", Value: "example@example.com" },
          ],
          UserLastModifiedDate: now,
          UserCreateDate: now,
          Enabled: true,
          RefreshTokens: [],
        });

        const file = JSON.parse(
          await readFile(dataDirectory + "/local.json", "utf-8")
        );

        expect(file.Users).toEqual({
          [username]: {
            Username: username,
            Password: "hunter3",
            UserStatus: "UNCONFIRMED",
            Attributes: [
              { Name: "sub", Value: "uuid-1234" },
              { Name: "email", Value: "example@example.com" },
            ],
            UserLastModifiedDate: now.toISOString(),
            UserCreateDate: now.toISOString(),
            Enabled: true,
            RefreshTokens: [],
          },
        });
      });

      it("updates a user", async () => {
        const now = new Date();
        const userPool = await cognitoClient.getUserPool("local");

        await userPool.saveUser({
          Username: username,
          Password: "hunter3",
          UserStatus: "UNCONFIRMED",
          ConfirmationCode: "1234",
          Attributes: [
            { Name: "sub", Value: "uuid-1234" },
            { Name: "email", Value: "example@example.com" },
          ],
          UserLastModifiedDate: now,
          UserCreateDate: now,
          Enabled: true,
          RefreshTokens: [],
        });

        let file = JSON.parse(
          await readFile(dataDirectory + "/local.json", "utf-8")
        );

        expect(file.Users).toEqual({
          [username]: {
            Username: username,
            Password: "hunter3",
            UserStatus: "UNCONFIRMED",
            ConfirmationCode: "1234",
            Attributes: [
              { Name: "sub", Value: "uuid-1234" },
              { Name: "email", Value: "example@example.com" },
            ],
            UserLastModifiedDate: now.toISOString(),
            UserCreateDate: now.toISOString(),
            Enabled: true,
            RefreshTokens: [],
          },
        });

        await userPool.saveUser({
          Username: username,
          Password: "hunter3",
          UserStatus: "CONFIRMED",
          Attributes: [
            { Name: "sub", Value: "uuid-1234" },
            { Name: "email", Value: "example@example.com" },
          ],
          UserLastModifiedDate: now,
          UserCreateDate: now,
          Enabled: true,
          RefreshTokens: [],
        });

        file = JSON.parse(
          await readFile(dataDirectory + "/local.json", "utf-8")
        );

        expect(file.Users).toEqual({
          [username]: {
            Username: username,
            Password: "hunter3",
            UserStatus: "CONFIRMED",
            Attributes: [
              { Name: "sub", Value: "uuid-1234" },
              { Name: "email", Value: "example@example.com" },
            ],
            UserLastModifiedDate: now.toISOString(),
            UserCreateDate: now.toISOString(),
            Enabled: true,
            RefreshTokens: [],
          },
        });
      });
    });
  });

  describe("getUserByUsername", () => {
    describe.each(validUsernameExamples)("with username %s", (username) => {
      let userPool: UserPoolService;
      beforeAll(async () => {
        userPool = await cognitoClient.getUserPool("local");

        await userPool.saveUser({
          Username: username,
          Password: "hunter2",
          UserStatus: "UNCONFIRMED",
          Attributes: [
            { Name: "sub", Value: "uuid-1234" },
            { Name: "email", Value: "example@example.com" },
            { Name: "phone_number", Value: "0411000111" },
          ],
          UserCreateDate: new Date(),
          UserLastModifiedDate: new Date(),
          Enabled: true,
          RefreshTokens: [],
        });
      });

      it("returns null if user doesn't exist", async () => {
        const user = await userPool.getUserByUsername("invalid");

        expect(user).toBeNull();
      });

      it("returns existing user by their username", async () => {
        const user = await userPool.getUserByUsername(username);

        expect(user).not.toBeNull();
        expect(user?.Username).toEqual(username);
      });
    });
  });

  describe("getUserByRefreshToken", () => {
    const username = "User";
    let userPool: UserPoolService;

    beforeAll(async () => {
      userPool = await cognitoClient.getUserPool("local");

      await userPool.saveUser({
        Username: username,
        Password: "hunter2",
        UserStatus: "UNCONFIRMED",
        Attributes: [
          { Name: "sub", Value: "uuid-1234" },
          { Name: "email", Value: "example@example.com" },
          { Name: "phone_number", Value: "0411000111" },
        ],
        UserCreateDate: new Date(),
        UserLastModifiedDate: new Date(),
        Enabled: true,
        RefreshTokens: ["refresh token"],
      });
    });

    it("returns null if the refresh token doesn't match a user", async () => {
      const user = await userPool.getUserByRefreshToken("invalid");

      expect(user).toBeNull();
    });

    it("returns user by their refresh token", async () => {
      const user = await userPool.getUserByRefreshToken("refresh token");

      expect(user).not.toBeNull();
      expect(user?.Username).toEqual(username);
    });
  });

  describe("storeRefreshToken", () => {
    const user = {
      Username: "User",
      Password: "hunter2",
      UserStatus: "UNCONFIRMED",
      Attributes: [
        { Name: "sub", Value: "uuid-1234" },
        { Name: "email", Value: "example@example.com" },
        { Name: "phone_number", Value: "0411000111" },
      ],
      UserCreateDate: new Date(),
      UserLastModifiedDate: new Date(),
      Enabled: true,
      RefreshTokens: [],
    };

    let userPool: UserPoolService;

    beforeAll(async () => {
      userPool = await cognitoClient.getUserPool("local");

      await userPool.saveUser(user);
    });

    it("saves a refresh token on the user", async () => {
      await userPool.storeRefreshToken("refresh token", user);

      const foundUser = await userPool.getUserByRefreshToken("refresh token");

      expect(foundUser).toMatchObject({
        Username: "User",
        RefreshTokens: ["refresh token"],
      });
    });
  });

  describe("listUsers", () => {
    let userPool: UserPoolService;
    let now: Date;

    beforeAll(async () => {
      now = new Date();
      userPool = await cognitoClient.getUserPool("local");

      await userPool.saveUser({
        Username: "1",
        Password: "hunter2",
        UserStatus: "UNCONFIRMED",
        Attributes: [
          { Name: "sub", Value: "uuid-1234" },
          { Name: "email", Value: "example@example.com" },
          { Name: "phone_number", Value: "0411000111" },
        ],
        UserCreateDate: now,
        UserLastModifiedDate: now,
        Enabled: true,
        RefreshTokens: [],
      });

      await userPool.saveUser({
        Username: "2",
        Password: "password1",
        UserStatus: "UNCONFIRMED",
        Attributes: [{ Name: "sub", Value: "uuid-5678" }],
        UserCreateDate: now,
        UserLastModifiedDate: now,
        Enabled: true,
        RefreshTokens: [],
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
            { Name: "sub", Value: "uuid-1234" },
            { Name: "email", Value: "example@example.com" },
            { Name: "phone_number", Value: "0411000111" },
          ],
          UserCreateDate: now,
          UserLastModifiedDate: now,
          Enabled: true,
          RefreshTokens: [],
        },
        {
          Username: "2",
          Password: "password1",
          UserStatus: "UNCONFIRMED",
          Attributes: [{ Name: "sub", Value: "uuid-5678" }],
          UserCreateDate: now,
          UserLastModifiedDate: now,
          Enabled: true,
          RefreshTokens: [],
        },
      ]);
    });
  });
});
