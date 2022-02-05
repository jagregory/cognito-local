import { MockClock } from "../mocks/MockClock";
import { MockDataStore, MockDataStoreFactory } from "../mocks/MockDataStore";
import { MockUserPoolServiceFactory } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";
import { ResourceNotFoundError } from "../errors";
import {
  CognitoServiceFactoryImpl,
  CognitoServiceImpl,
  USER_POOL_AWS_DEFAULTS,
} from "./cognitoService";
import { UserPoolService, UserPoolServiceFactory } from "./userPoolService";

describe("CognitoServiceFactory", () => {
  it("creates a database for clients", async () => {
    const mockDataStoreFactory = MockDataStoreFactory();
    const factory = new CognitoServiceFactoryImpl(
      "data-directory",
      new MockClock(new Date()),
      mockDataStoreFactory,
      MockUserPoolServiceFactory()
    );

    await factory.create(MockContext, {});

    expect(mockDataStoreFactory.create).toHaveBeenCalledWith(
      MockContext,
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
    mockUserPoolServiceFactory = MockUserPoolServiceFactory(mockUserPool);
  });

  describe("getUserPool", () => {
    // For now we're being lenient with the creation of user pools, if one is
    // used that doesn't exist we just create it and allow the operation to
    // continue. This may change in a later release.
    it("creates a user pool by the id specified", async () => {
      mockUserPoolServiceFactory.create.mockResolvedValue(mockUserPool);

      const clientsDataStore = MockDataStore();

      const cognitoClient = new CognitoServiceImpl(
        "data-directory",
        clientsDataStore,
        new MockClock(new Date()),
        { UsernameAttributes: [] },
        mockUserPoolServiceFactory
      );

      const userPool = await cognitoClient.getUserPool(MockContext, "testing");

      expect(mockUserPoolServiceFactory.create).toHaveBeenCalledWith(
        MockContext,
        clientsDataStore,
        { ...USER_POOL_AWS_DEFAULTS, Id: "testing", UsernameAttributes: [] }
      );
      expect(userPool).toEqual(mockUserPool);
    });
  });

  describe("getUserPoolForClientId", () => {
    it("throws if client isn't registered", async () => {
      mockUserPoolServiceFactory.create.mockResolvedValue(mockUserPool);

      const clientsDataStore = MockDataStore();
      clientsDataStore.get.mockResolvedValue(null);

      const cognitoClient = new CognitoServiceImpl(
        "data-directory",
        clientsDataStore,
        new MockClock(new Date()),
        { UsernameAttributes: [] },
        mockUserPoolServiceFactory
      );

      await expect(
        cognitoClient.getUserPoolForClientId(MockContext, "testing")
      ).rejects.toBeInstanceOf(ResourceNotFoundError);

      expect(mockUserPoolServiceFactory.create).not.toHaveBeenCalled();
    });

    it("creates a user pool by the id in the client config", async () => {
      mockUserPoolServiceFactory.create.mockResolvedValue(mockUserPool);

      const clientsDataStore = MockDataStore();
      clientsDataStore.get.mockResolvedValue({
        UserPoolId: "userPoolId",
      });

      const cognitoClient = new CognitoServiceImpl(
        "data-directory",
        clientsDataStore,
        new MockClock(new Date()),
        { UsernameAttributes: [] },
        mockUserPoolServiceFactory
      );

      const userPool = await cognitoClient.getUserPoolForClientId(
        MockContext,
        "testing"
      );

      expect(clientsDataStore.get).toHaveBeenCalledWith(MockContext, [
        "Clients",
        "testing",
      ]);
      expect(mockUserPoolServiceFactory.create).toHaveBeenCalledWith(
        MockContext,
        clientsDataStore,
        { ...USER_POOL_AWS_DEFAULTS, Id: "userPoolId", UsernameAttributes: [] }
      );
      expect(userPool).toEqual(mockUserPool);
    });
  });
});
