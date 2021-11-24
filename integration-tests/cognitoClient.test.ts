import { MockLogger } from "../src/__tests__/mockLogger";
import { CognitoClientService, UserPoolClientService } from "../src/services";
import { DateClock } from "../src/services/clock";
import { CreateDataStore, createDataStore } from "../src/services/dataStore";
import fs from "fs";
import { promisify } from "util";

const mkdtemp = promisify(fs.mkdtemp);
const rmdir = promisify(fs.rmdir);

describe("Cognito Client", () => {
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
    await CognitoClientService.create(
      {
        Id: "local",
        UsernameAttributes: [],
      },
      new DateClock(),
      tmpCreateDataStore,
      UserPoolClientService.create,
      MockLogger
    );

    expect(fs.existsSync(`${path}/clients.json`)).toBe(true);
  });
});
