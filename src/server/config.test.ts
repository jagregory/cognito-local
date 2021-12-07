import {
  newMockDataStore,
  newMockDataStoreFactory,
} from "../__tests__/mockDataStore";
import { TestContext } from "../__tests__/testContext";
import { DefaultConfig, loadConfig } from "./config";

describe("loadConfig", () => {
  it("returns the default config if no config exists", async () => {
    const config = await loadConfig(TestContext, newMockDataStoreFactory());

    expect(config).toEqual(DefaultConfig);
  });

  it("merges the defaults with any existing config", async () => {
    const ds = newMockDataStore();
    const mockDataStoreFactory = newMockDataStoreFactory(ds);

    ds.getRoot.mockResolvedValue({
      TriggerFunctions: {
        CustomMessage: "custom-config",
      },
      UserPoolDefaults: {
        MFAOptions: "OPTIONAL",
      },
    });

    const config = await loadConfig(TestContext, mockDataStoreFactory);

    expect(config).toEqual({
      ...DefaultConfig,
      TriggerFunctions: {
        CustomMessage: "custom-config",
      },
      UserPoolDefaults: {
        // new field
        MFAOptions: "OPTIONAL",
        // field from defaults
        UsernameAttributes: ["email"],
      },
    });
  });

  it("can unset a property when merging", async () => {
    const ds = newMockDataStore();
    const mockDataStoreFactory = newMockDataStoreFactory(ds);

    ds.getRoot.mockResolvedValue({
      UserPoolDefaults: {
        UsernameAttributes: null,
      },
    });

    const config = await loadConfig(TestContext, mockDataStoreFactory);

    expect(config).toEqual({
      ...DefaultConfig,
      UserPoolDefaults: {
        UsernameAttributes: null,
      },
    });
  });

  it("overwrites arrays when merging", async () => {
    const ds = newMockDataStore();
    const mockDataStoreFactory = newMockDataStoreFactory(ds);

    ds.getRoot.mockResolvedValue({
      UserPoolDefaults: {
        UsernameAttributes: ["phone_number"],
      },
    });

    const config = await loadConfig(TestContext, mockDataStoreFactory);

    expect(config).toEqual({
      ...DefaultConfig,
      UserPoolDefaults: {
        UsernameAttributes: ["phone_number"],
      },
    });
  });

  it("can set an arrays to empty when merging", async () => {
    const ds = newMockDataStore();
    const mockDataStoreFactory = newMockDataStoreFactory(ds);

    ds.getRoot.mockResolvedValue({
      UserPoolDefaults: {
        UsernameAttributes: [],
      },
    });

    const config = await loadConfig(TestContext, mockDataStoreFactory);

    expect(config).toEqual({
      ...DefaultConfig,
      UserPoolDefaults: {
        UsernameAttributes: [],
      },
    });
  });
});
