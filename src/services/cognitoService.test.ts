import { ClockFake } from "../__tests__/clockFake";
import {
  newMockDataStore,
  newMockDataStoreFactory,
} from "../__tests__/mockDataStore";
import { newMockUserPoolServiceFactory } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import { ResourceNotFoundError } from "../errors";
import {
  CognitoServiceFactoryImpl,
  CognitoServiceImpl,
  USER_POOL_AWS_DEFAULTS,
} from "./cognitoService";
import { UserPoolService, UserPoolServiceFactory } from "./userPoolService";

describe("CognitoServiceFactory", () => {
  it("creates a database for clients", async () => {
    const mockDataStoreFactory = newMockDataStoreFactory();
    const factory = new CognitoServiceFactoryImpl(
      "data-directory",
      new ClockFake(new Date()),
      mockDataStoreFactory,
      newMockUserPoolServiceFactory()
    );

    await factory.create(TestContext, {});

    expect(mockDataStoreFactory.create).toHaveBeenCalledWith(
      TestContext,
      "clients",
      {
        Clients: {},
      }
    );
  });
});

describe("Cognito Service", () => {
  let mockUserPool: jest.Mocked<UserPoolService>;
  let mockUserPoolServiceFactory: jest.Mocked<UserPoolServiceFactory>;

  beforeEach(() => {
    mockUserPoolServiceFactory = newMockUserPoolServiceFactory(mockUserPool);
  });

  describe("getUserPool", () => {
    // For now we're being lenient with the creation of user pools, if one is
    // used that doesn't exist we just create it and allow the operation to
    // continue. This may change in a later release.
    it("creates a user pool by the id specified", async () => {
      mockUserPoolServiceFactory.create.mockResolvedValue(mockUserPool);

      const clientsDataStore = newMockDataStore();

      const cognitoClient = new CognitoServiceImpl(
        "data-directory",
        clientsDataStore,
        new ClockFake(new Date()),
        { UsernameAttributes: [] },
        mockUserPoolServiceFactory
      );

      const userPool = await cognitoClient.getUserPool(TestContext, "testing");

      expect(mockUserPoolServiceFactory.create).toHaveBeenCalledWith(
        TestContext,
        clientsDataStore,
        { ...USER_POOL_AWS_DEFAULTS, Id: "testing", UsernameAttributes: [] }
      );
      expect(userPool).toEqual(mockUserPool);
    });
  });

  describe("getUserPoolForClientId", () => {
    it("throws if client isn't registered", async () => {
      mockUserPoolServiceFactory.create.mockResolvedValue(mockUserPool);

      const clientsDataStore = newMockDataStore();
      clientsDataStore.get.mockResolvedValue(null);

      const cognitoClient = new CognitoServiceImpl(
        "data-directory",
        clientsDataStore,
        new ClockFake(new Date()),
        { UsernameAttributes: [] },
        mockUserPoolServiceFactory
      );

      await expect(
        cognitoClient.getUserPoolForClientId(TestContext, "testing")
      ).rejects.toBeInstanceOf(ResourceNotFoundError);

      expect(mockUserPoolServiceFactory.create).not.toHaveBeenCalled();
    });

    it("creates a user pool by the id in the client config", async () => {
      mockUserPoolServiceFactory.create.mockResolvedValue(mockUserPool);

      const clientsDataStore = newMockDataStore();
      clientsDataStore.get.mockResolvedValue({
        UserPoolId: "userPoolId",
      });

      const cognitoClient = new CognitoServiceImpl(
        "data-directory",
        clientsDataStore,
        new ClockFake(new Date()),
        { UsernameAttributes: [] },
        mockUserPoolServiceFactory
      );

      const userPool = await cognitoClient.getUserPoolForClientId(
        TestContext,
        "testing"
      );

      expect(clientsDataStore.get).toHaveBeenCalledWith(TestContext, [
        "Clients",
        "testing",
      ]);
      expect(mockUserPoolServiceFactory.create).toHaveBeenCalledWith(
        TestContext,
        clientsDataStore,
        { ...USER_POOL_AWS_DEFAULTS, Id: "userPoolId", UsernameAttributes: [] }
      );
      expect(userPool).toEqual(mockUserPool);
    });
  });
});
