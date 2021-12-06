import { TestContext } from "../src/__tests__/testContext";
import {
  CognitoServiceImpl,
  DateClock,
  UserPoolServiceImpl,
} from "../src/services";
import { USER_POOL_AWS_DEFAULTS } from "../src/services/cognitoService";
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
      TestContext,
      dataDirectory,
      {},
      new DateClock(),
      createDataStore,
      UserPoolServiceImpl.create
    );

    expect(fs.existsSync(`${dataDirectory}/clients.json`)).toBe(true);
  });

  it("creates a user pool database", async () => {
    const cognitoService = await CognitoServiceImpl.create(
      TestContext,
      dataDirectory,
      {},
      new DateClock(),
      createDataStore,
      UserPoolServiceImpl.create
    );

    await cognitoService.getUserPool(TestContext, "test-pool");

    expect(fs.existsSync(`${dataDirectory}/test-pool.json`)).toBe(true);
  });

  it("lists multiple user pools", async () => {
    const cognitoService = await CognitoServiceImpl.create(
      TestContext,
      dataDirectory,
      {},
      new DateClock(),
      createDataStore,
      UserPoolServiceImpl.create
    );

    await cognitoService.getUserPool(TestContext, "test-pool-1");
    await cognitoService.getUserPool(TestContext, "test-pool-2");
    await cognitoService.getUserPool(TestContext, "test-pool-3");

    expect(fs.existsSync(`${dataDirectory}/test-pool-1.json`)).toBe(true);
    expect(fs.existsSync(`${dataDirectory}/test-pool-2.json`)).toBe(true);
    expect(fs.existsSync(`${dataDirectory}/test-pool-3.json`)).toBe(true);

    const pools = await cognitoService.listUserPools(TestContext);
    expect(pools).toEqual([
      { ...USER_POOL_AWS_DEFAULTS, Id: "test-pool-1" },
      { ...USER_POOL_AWS_DEFAULTS, Id: "test-pool-2" },
      { ...USER_POOL_AWS_DEFAULTS, Id: "test-pool-3" },
    ]);
  });
});
