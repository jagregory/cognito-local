import fs from "node:fs";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TestContext } from "../src/__tests__/testContext";
import { DateClock } from "../src/services";
import {
  type CognitoServiceFactory,
  CognitoServiceFactoryImpl,
  USER_POOL_AWS_DEFAULTS,
} from "../src/services/cognitoService";
import { StormDBDataStoreFactory } from "../src/services/dataStore/stormDb";
import { UserPoolServiceFactoryImpl } from "../src/services/userPoolService";

const mkdtemp = promisify(fs.mkdtemp);
const rm = promisify(fs.rm);

describe("Cognito Service", () => {
  let dataDirectory: string;
  let factory: CognitoServiceFactory;

  beforeEach(async () => {
    dataDirectory = await mkdtemp("/tmp/cognito-local:");

    const clock = new DateClock();
    const dataStoreFactory = new StormDBDataStoreFactory(dataDirectory);

    factory = new CognitoServiceFactoryImpl(
      dataDirectory,
      dataStoreFactory,
      new UserPoolServiceFactoryImpl(clock, dataStoreFactory),
    );
  });

  afterEach(() =>
    rm(dataDirectory, {
      recursive: true,
    }),
  );

  describe("CognitoServiceFactory", () => {
    it("creates a clients database", async () => {
      await factory.create(TestContext, {});

      expect(fs.existsSync(`${dataDirectory}/clients.json`)).toBe(true);
    });
  });

  it("creates a user pool database", async () => {
    const cognitoService = await factory.create(TestContext, {});

    await cognitoService.createUserPool(TestContext, {
      Id: "test-pool",
      Name: "Test Pool",
    });

    expect(fs.existsSync(`${dataDirectory}/test-pool.json`)).toBe(true);

    const userPool = await cognitoService.getUserPool(TestContext, "test-pool");

    expect(userPool.options).toEqual({
      ...USER_POOL_AWS_DEFAULTS,
      Id: "test-pool",
      Name: "Test Pool",
    });
  });

  it("lists multiple user pools", async () => {
    const cognitoService = await factory.create(TestContext, {});

    await cognitoService.createUserPool(TestContext, {
      Id: "test-pool-1",
      Name: "Test Pool 1",
    });
    await cognitoService.createUserPool(TestContext, {
      Id: "test-pool-2",
      Name: "Test Pool 2",
    });
    await cognitoService.createUserPool(TestContext, {
      Id: "test-pool-3",
      Name: "Test Pool 3",
    });

    expect(fs.existsSync(`${dataDirectory}/test-pool-1.json`)).toBe(true);
    expect(fs.existsSync(`${dataDirectory}/test-pool-2.json`)).toBe(true);
    expect(fs.existsSync(`${dataDirectory}/test-pool-3.json`)).toBe(true);

    const pools = await cognitoService.listUserPools(TestContext);
    expect(pools).toEqual([
      { ...USER_POOL_AWS_DEFAULTS, Id: "test-pool-1", Name: "Test Pool 1" },
      { ...USER_POOL_AWS_DEFAULTS, Id: "test-pool-2", Name: "Test Pool 2" },
      { ...USER_POOL_AWS_DEFAULTS, Id: "test-pool-3", Name: "Test Pool 3" },
    ]);
  });

  it("deletes user pools", async () => {
    const cognitoService = await factory.create(TestContext, {});

    const up1 = await cognitoService.createUserPool(TestContext, {
      Id: "test-pool-1",
      Name: "Test Pool 1",
    });
    const up2 = await cognitoService.createUserPool(TestContext, {
      Id: "test-pool-2",
      Name: "Test Pool-2",
    });

    expect(fs.existsSync(`${dataDirectory}/test-pool-1.json`)).toBe(true);
    expect(fs.existsSync(`${dataDirectory}/test-pool-2.json`)).toBe(true);

    await cognitoService.deleteUserPool(TestContext, up1);

    expect(fs.existsSync(`${dataDirectory}/test-pool-1.json`)).not.toBe(true);

    await cognitoService.deleteUserPool(TestContext, up2);

    expect(fs.existsSync(`${dataDirectory}/test-pool-2.json`)).not.toBe(true);
  });
});
