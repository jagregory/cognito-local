import { MockContext } from "../src/mocks/MockContext";
import { DateClock } from "../src/services";
import {
  CognitoServiceFactory,
  CognitoServiceFactoryImpl,
  USER_POOL_AWS_DEFAULTS,
} from "../src/services/cognitoService";
import fs from "fs";
import { promisify } from "util";
import { NoOpCache } from "../src/services/dataStore/cache";
import { StormDBDataStoreFactory } from "../src/services/dataStore/stormDb";
import { UserPoolServiceFactoryImpl } from "../src/services/userPoolService";

const mkdtemp = promisify(fs.mkdtemp);
const rmdir = promisify(fs.rmdir);

describe("Cognito Service", () => {
  let dataDirectory: string;
  let factory: CognitoServiceFactory;

  beforeEach(async () => {
    dataDirectory = await mkdtemp("/tmp/cognito-local:");

    const clock = new DateClock();
    const dataStoreFactory = new StormDBDataStoreFactory(
      dataDirectory,
      new NoOpCache()
    );

    factory = new CognitoServiceFactoryImpl(
      dataDirectory,
      clock,
      dataStoreFactory,
      new UserPoolServiceFactoryImpl(clock, dataStoreFactory)
    );
  });

  afterEach(() =>
    rmdir(dataDirectory, {
      recursive: true,
    })
  );

  describe("CognitoServiceFactory", () => {
    it("creates a clients database", async () => {
      await factory.create(MockContext, {});

      expect(fs.existsSync(`${dataDirectory}/clients.json`)).toBe(true);
    });
  });

  it("creates a user pool database", async () => {
    const cognitoService = await factory.create(MockContext, {});

    await cognitoService.getUserPool(MockContext, "test-pool");

    expect(fs.existsSync(`${dataDirectory}/test-pool.json`)).toBe(true);
  });

  it("lists multiple user pools", async () => {
    const cognitoService = await factory.create(MockContext, {});

    await cognitoService.getUserPool(MockContext, "test-pool-1");
    await cognitoService.getUserPool(MockContext, "test-pool-2");
    await cognitoService.getUserPool(MockContext, "test-pool-3");

    expect(fs.existsSync(`${dataDirectory}/test-pool-1.json`)).toBe(true);
    expect(fs.existsSync(`${dataDirectory}/test-pool-2.json`)).toBe(true);
    expect(fs.existsSync(`${dataDirectory}/test-pool-3.json`)).toBe(true);

    const pools = await cognitoService.listUserPools(MockContext);
    expect(pools).toEqual([
      { ...USER_POOL_AWS_DEFAULTS, Id: "test-pool-1" },
      { ...USER_POOL_AWS_DEFAULTS, Id: "test-pool-2" },
      { ...USER_POOL_AWS_DEFAULTS, Id: "test-pool-3" },
    ]);
  });
});
