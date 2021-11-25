import { MockLogger } from "../src/__tests__/mockLogger";
import {
  CognitoServiceImpl,
  DateClock,
  UserPoolServiceImpl,
} from "../src/services";
import { CreateDataStore, createDataStore } from "../src/services/dataStore";
import fs from "fs";
import { promisify } from "util";

const mkdtemp = promisify(fs.mkdtemp);
const rmdir = promisify(fs.rmdir);

describe("Cognito Service", () => {
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

  it("creates a clients database", async () => {
    await CognitoServiceImpl.create(
      {
        Id: "local",
        UsernameAttributes: [],
      },
      new DateClock(),
      tmpCreateDataStore,
      UserPoolServiceImpl.create,
      MockLogger
    );

    expect(fs.existsSync(`${path}/clients.json`)).toBe(true);
  });
});
