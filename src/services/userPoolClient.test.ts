import { advanceTo } from "jest-date-mock";
import { CreateDataStore, DataStore } from "./dataStore";
import {
  attributesFromRecord,
  attributesInclude,
  attributesIncludeMatch,
  attributesToRecord,
  createUserPoolClient,
  UserAttribute,
  UserPoolClient,
} from "./userPoolClient";

describe("User Pool Client", () => {
  let mockClientsDataStore: jest.Mocked<DataStore>;
  let mockDataStore: jest.Mocked<DataStore>;
  let createDataStore: jest.MockedFunction<CreateDataStore>;
  let now: Date;

  beforeEach(() => {
    now = new Date(2020, 1, 2, 3, 4, 5);
    advanceTo(now);

    mockClientsDataStore = {
      set: jest.fn(),
      setValue: jest.fn(),
      get: jest.fn(),
      getRoot: jest.fn(),
    };
    mockDataStore = {
      set: jest.fn(),
      setValue: jest.fn(),
      get: jest.fn(),
      getRoot: jest.fn(),
    };
    createDataStore = jest.fn().mockResolvedValue(mockDataStore);
  });

  it("creates a database", async () => {
    await createUserPoolClient(
      { Id: "local", UsernameAttributes: [] },
      mockClientsDataStore,
      createDataStore
    );

    expect(createDataStore).toHaveBeenCalledWith("local", {
      Options: { Id: "local", UsernameAttributes: [] },
      Users: {},
    });
  });

  describe("createAppClient", () => {
    it("saves an app client", async () => {
      const userPool = await createUserPoolClient(
        { Id: "local", UsernameAttributes: [] },
        mockClientsDataStore,
        createDataStore
      );

      const result = await userPool.createAppClient("clientName");

      expect(result).toEqual({
        AllowedOAuthFlowsUserPoolClient: false,
        ClientId: expect.stringMatching(/^[a-z0-9]{25}$/),
        ClientName: "clientName",
        CreationDate: now.getTime(),
        LastModifiedDate: now.getTime(),
        RefreshTokenValidity: 30,
        UserPoolId: "local",
      });

      expect(mockClientsDataStore.set).toHaveBeenCalledWith(
        ["Clients", result.ClientId],
        result
      );
    });
  });

  describe("saveUser", () => {
    it("saves a user with their username as an additional attribute", async () => {
      const now = new Date().getTime();
      const userPool = await createUserPoolClient(
        { Id: "local", UsernameAttributes: [] },
        mockClientsDataStore,
        createDataStore
      );

      await userPool.saveUser({
        Username: "1",
        Password: "hunter3",
        UserStatus: "UNCONFIRMED",
        Attributes: [{ Name: "email", Value: "example@example.com" }],
        UserLastModifiedDate: now,
        UserCreateDate: now,
        Enabled: true,
      });

      expect(mockDataStore.set).toHaveBeenCalledWith("Users.1", {
        Username: "1",
        Password: "hunter3",
        UserStatus: "UNCONFIRMED",
        Attributes: [
          { Name: "sub", Value: "1" },
          { Name: "email", Value: "example@example.com" },
        ],
        UserLastModifiedDate: now,
        UserCreateDate: now,
        Enabled: true,
      });
    });
  });

  describe("getUserByUsername", () => {
    describe.each`
      username_attributes          | find_by_email | find_by_phone_number
      ${[]}                        | ${false}      | ${false}
      ${["email"]}                 | ${true}       | ${false}
      ${["phone_number"]}          | ${false}      | ${true}
      ${["email", "phone_number"]} | ${true}       | ${true}
    `(
      "$username_attributes username attributes",
      ({ username_attributes, find_by_email, find_by_phone_number }) => {
        let userPool: UserPoolClient;

        beforeAll(async () => {
          const options = {
            Id: "local",
            UsernameAttributes: username_attributes,
          };
          const users = {
            "1": {
              Username: "1",
              Password: "hunter3",
              UserStatus: "UNCONFIRMED",
              Attributes: [
                { Name: "sub", Value: "1" },
                { Name: "email", Value: "example@example.com" },
                { Name: "phone_number", Value: "0411000111" },
              ],
              UserLastModifiedDate: new Date().getTime(),
              UserCreateDate: new Date().getTime(),
              Enabled: true,
            },
          };
          mockDataStore.get.mockImplementation((key) => {
            if (key === "Users") {
              return Promise.resolve(users);
            } else if (key === "Options") {
              return Promise.resolve(options);
            }

            return Promise.resolve(null);
          });
          userPool = await createUserPoolClient(
            options,
            mockClientsDataStore,
            createDataStore
          );
        });

        it("returns null if user doesn't exist", async () => {
          const user = await userPool.getUserByUsername("invalid");

          expect(user).toBeNull();
        });

        it("returns existing user by their sub attribute", async () => {
          const user = await userPool.getUserByUsername("1");

          expect(user).not.toBeNull();
          expect(user?.Username).toEqual("1");
        });

        if (find_by_email) {
          it("returns existing user by their email", async () => {
            const user = await userPool.getUserByUsername(
              "example@example.com"
            );

            expect(user).not.toBeNull();
            expect(user?.Username).toEqual("1");
          });
        } else {
          it("does not return the user by their email", async () => {
            const user = await userPool.getUserByUsername(
              "example@example.com"
            );

            expect(user).toBeNull();
          });
        }

        if (find_by_phone_number) {
          it("returns existing user by their phone number", async () => {
            const user = await userPool.getUserByUsername("0411000111");

            expect(user).not.toBeNull();
            expect(user?.Username).toEqual("1");
          });
        } else {
          it("does not return the user by their phone number", async () => {
            const user = await userPool.getUserByUsername("0411000111");

            expect(user).toBeNull();
          });
        }
      }
    );
  });

  describe("listUsers", () => {
    let userPool: UserPoolClient;

    beforeEach(async () => {
      const options = {
        Id: "local",
      };
      const users = {
        "1": {
          Username: "1",
          Password: "hunter3",
          UserStatus: "UNCONFIRMED",
          Attributes: [
            { Name: "sub", Value: "1" },
            { Name: "email", Value: "example@example.com" },
            { Name: "phone_number", Value: "0411000111" },
          ],
          UserLastModifiedDate: new Date().getTime(),
          UserCreateDate: new Date().getTime(),
          Enabled: true,
        },
      };
      mockDataStore.get.mockImplementation((key) => {
        if (key === "Users") {
          return Promise.resolve(users);
        } else if (key === "Options") {
          return Promise.resolve(options);
        }

        return Promise.resolve(null);
      });
      userPool = await createUserPoolClient(
        options,
        mockClientsDataStore,
        createDataStore
      );
    });

    it("returns existing users", async () => {
      const users = await userPool.listUsers();

      expect(users).not.toBeNull();
      expect(users).toHaveLength(1);
      expect(users[0].Username).toEqual("1");
    });
  });

  describe("attributes", () => {
    const attributes: readonly UserAttribute[] = [
      { Name: "sub", Value: "uuid" },
      { Name: "email", Value: "example@example.com" },
    ];

    describe("attributesIncludeMatch", () => {
      it("returns true if attribute exists in collection with matching name and value", () => {
        expect(
          attributesIncludeMatch("email", "example@example.com", attributes)
        ).toBe(true);
      });

      it("returns false if attribute exists in collection with matching name but not matching value", () => {
        expect(attributesIncludeMatch("email", "invalid", attributes)).toBe(
          false
        );
      });

      it("returns false if attribute does not exist in collection", () => {
        expect(attributesIncludeMatch("invalid", "invalid", attributes)).toBe(
          false
        );
      });
    });

    describe("attributesInclude", () => {
      it("returns true if attribute exists in collection with matching name", () => {
        expect(attributesInclude("email", attributes)).toBe(true);
      });

      it("returns false if attribute does not exist in collection", () => {
        expect(attributesInclude("invalid", attributes)).toBe(false);
      });
    });

    describe("attributesToRecord", () => {
      it("converts the attributes to a record", () => {
        expect(attributesToRecord(attributes)).toEqual({
          sub: "uuid",
          email: "example@example.com",
        });
      });
    });

    describe("attributesFromRecord", () => {
      it("converts the attributes to a record", () => {
        expect(
          attributesFromRecord({
            sub: "uuid",
            email: "example@example.com",
          })
        ).toEqual(attributes);
      });
    });
  });
});
