import { createCognitoClient } from "../src/services/cognitoClient";
import { CreateDataStore, createDataStore } from "../src/services/dataStore";
import { createUserPoolClient } from "../src/services/userPoolClient";
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
    await createCognitoClient(
      {
        Id: "local",
        UsernameAttributes: [],
      },
      tmpCreateDataStore,
      createUserPoolClient
    );

    expect(fs.existsSync(`${path}/clients.json`)).toBe(true);
  });
});
