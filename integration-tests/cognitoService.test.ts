import { MockLogger } from "../src/__tests__/mockLogger";
import {
  CognitoServiceImpl,
  DateClock,
  UserPoolServiceImpl,
} from "../src/services";
import { createDataStore } from "../src/services/dataStore";
import fs from "fs";
import { promisify } from "util";

const mkdtemp = promisify(fs.mkdtemp);
const rmdir = promisify(fs.rmdir);

describe("Cognito Service", () => {
  let dataDirectory: string;

  beforeEach(async () => {
    dataDirectory = await mkdtemp("/tmp/cognito-local:");
  });

  afterEach(() =>
    rmdir(dataDirectory, {
      recursive: true,
    })
  );

  it("creates a clients database", async () => {
    await CognitoServiceImpl.create(
      dataDirectory,
      {
        Id: "local",
        UsernameAttributes: [],
      },
      new DateClock(),
      createDataStore,
      UserPoolServiceImpl.create,
      MockLogger
    );

    expect(fs.existsSync(`${dataDirectory}/clients.json`)).toBe(true);
  });

  it("creates a user pool database", async () => {
    const cognitoService = await CognitoServiceImpl.create(
      dataDirectory,
      {
        Id: "local",
        UsernameAttributes: [],
      },
      new DateClock(),
      createDataStore,
      UserPoolServiceImpl.create,
      MockLogger
    );

    await cognitoService.getUserPool("test-pool");

    expect(fs.existsSync(`${dataDirectory}/test-pool.json`)).toBe(true);
  });

  it("lists multiple user pools", async () => {
    const cognitoService = await CognitoServiceImpl.create(
      dataDirectory,
      {
        Id: "local",
        UsernameAttributes: [],
      },
      new DateClock(),
      createDataStore,
      UserPoolServiceImpl.create,
      MockLogger
    );

    await cognitoService.getUserPool("test-pool-1");
    await cognitoService.getUserPool("test-pool-2");
    await cognitoService.getUserPool("test-pool-3");

    expect(fs.existsSync(`${dataDirectory}/test-pool-1.json`)).toBe(true);
    expect(fs.existsSync(`${dataDirectory}/test-pool-2.json`)).toBe(true);
    expect(fs.existsSync(`${dataDirectory}/test-pool-3.json`)).toBe(true);

    const pools = await cognitoService.listUserPools();
    expect(pools).toEqual([
      { Id: "test-pool-1", UsernameAttributes: [] },
      { Id: "test-pool-2", UsernameAttributes: [] },
      { Id: "test-pool-3", UsernameAttributes: [] },
    ]);
  });
});
