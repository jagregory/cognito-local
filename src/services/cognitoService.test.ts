import { newMockDataStore } from "../__tests__/mockDataStore";
import { TestContext } from "../__tests__/testContext";
import { ResourceNotFoundError } from "../errors";
import { DateClock } from "./clock";
import { CognitoServiceImpl, USER_POOL_AWS_DEFAULTS } from "./cognitoService";
import { CreateDataStore, DataStore } from "./dataStore";
import { CreateUserPoolService, UserPoolService } from "./userPoolService";

describe("Cognito Service", () => {
  let mockDataStore: jest.Mocked<DataStore>;
  let mockUserPool: jest.Mocked<UserPoolService>;
  let createUserPoolClient: jest.MockedFunction<CreateUserPoolService>;
  let createDataStore: jest.MockedFunction<CreateDataStore>;
  const clock = new DateClock();

  beforeEach(() => {
    mockDataStore = newMockDataStore();
    createUserPoolClient = jest.fn().mockResolvedValue(mockUserPool);
    createDataStore = jest.fn().mockResolvedValue(mockDataStore);
  });

  it("creates a database for clients", async () => {
    const createDataStore = jest.fn(
      () => mockDataStore
    ) as unknown as CreateDataStore;
    await CognitoServiceImpl.create(
      TestContext,
      "data-directory",
      {},
      clock,
      createDataStore,
      createUserPoolClient
    );

    expect(createDataStore).toHaveBeenCalledWith(
      TestContext,
      "clients",
      {
        Clients: {},
      },
      "data-directory"
    );
  });

  describe("getUserPool", () => {
    // For now we're being lenient with the creation of user pools, if one is
    // used that doesn't exist we just create it and allow the operation to
    // continue. This may change in a later release.
    it("creates a user pool by the id specified", async () => {
      const cognitoClient = await CognitoServiceImpl.create(
        TestContext,
        "data-directory",
        { UsernameAttributes: [] },
        clock,
        createDataStore,
        createUserPoolClient
      );

      const userPool = await cognitoClient.getUserPool(TestContext, "testing");

      expect(createUserPoolClient).toHaveBeenCalledWith(
        TestContext,
        "data-directory",
        mockDataStore,
        clock,
        createDataStore,
        { ...USER_POOL_AWS_DEFAULTS, Id: "testing", UsernameAttributes: [] }
      );
      expect(userPool).toEqual(mockUserPool);
    });
  });

  describe("getUserPoolForClientId", () => {
    it("throws if client isn't registered", async () => {
      mockDataStore.get.mockResolvedValue(null);
      const cognitoClient = await CognitoServiceImpl.create(
        TestContext,
        "data-directory",
        {},
        clock,
        createDataStore,
        createUserPoolClient
      );

      await expect(
        cognitoClient.getUserPoolForClientId(TestContext, "testing")
      ).rejects.toBeInstanceOf(ResourceNotFoundError);

      expect(createUserPoolClient).not.toHaveBeenCalled();
    });

    it("creates a user pool by the id in the client config", async () => {
      mockDataStore.get.mockResolvedValue({
        UserPoolId: "userPoolId",
      });
      const cognitoClient = await CognitoServiceImpl.create(
        TestContext,
        "data-directory",
        { UsernameAttributes: [] },
        clock,
        createDataStore,
        createUserPoolClient
      );

      const userPool = await cognitoClient.getUserPoolForClientId(
        TestContext,
        "testing"
      );

      expect(mockDataStore.get).toHaveBeenCalledWith(TestContext, [
        "Clients",
        "testing",
      ]);
      expect(createUserPoolClient).toHaveBeenCalledWith(
        TestContext,
        "data-directory",
        mockDataStore,
        clock,
        createDataStore,
        { ...USER_POOL_AWS_DEFAULTS, Id: "userPoolId", UsernameAttributes: [] }
      );
      expect(userPool).toEqual(mockUserPool);
    });
  });
});
