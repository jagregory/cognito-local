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
});
