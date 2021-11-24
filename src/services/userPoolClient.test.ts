import { ClockFake } from "../__tests__/clockFake";
import { AttributeListType } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { MockLogger } from "../__tests__/mockLogger";
import { DataStore } from "./dataStore";
import {
  attributesFromRecord,
  attributesInclude,
  attributesIncludeMatch,
  attributesToRecord,
  User,
  UserPoolClient,
  UserPoolClientService,
} from "./userPoolClient";

describe("User Pool Client", () => {
  let mockClientsDataStore: jest.Mocked<DataStore>;
  const currentDate = new Date(2020, 1, 2, 3, 4, 5);

  let clock: ClockFake;

  beforeEach(() => {
    clock = new ClockFake(currentDate);

    mockClientsDataStore = {
      set: jest.fn(),
      get: jest.fn(),
      getRoot: jest.fn(),
    };
  });

  it("creates a database", async () => {
    const createDataStore = jest.fn().mockResolvedValue({
      set: jest.fn(),
      get: jest.fn(),
      getRoot: jest.fn(),
    });

    await UserPoolClientService.create(
      mockClientsDataStore,
      clock,
      createDataStore,
      { Id: "local", UsernameAttributes: [] },
      MockLogger
    );

    expect(createDataStore).toHaveBeenCalledWith("local", {
      Options: { Id: "local", UsernameAttributes: [] },
      Users: {},
    });
  });

  describe("createAppClient", () => {
    it("saves an app client", async () => {
      const userPool = await UserPoolClientService.create(
        mockClientsDataStore,
        clock,
        () =>
          Promise.resolve({
            set: jest.fn(),
            get: jest
              .fn()
              .mockImplementation((key, defaults) => Promise.resolve(defaults)),
            getRoot: jest.fn(),
          }),
        { Id: "local", UsernameAttributes: [] },
        MockLogger
      );

      const result = await userPool.createAppClient("clientName");

      expect(result).toEqual({
        AllowedOAuthFlowsUserPoolClient: false,
        ClientId: expect.stringMatching(/^[a-z0-9]{25}$/),
        ClientName: "clientName",
        CreationDate: Math.floor(currentDate.getTime() / 1000),
        LastModifiedDate: Math.floor(currentDate.getTime() / 1000),
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
    it("saves the user", async () => {
      const now = Math.floor(new Date().getTime() / 1000);
      const set = jest.fn();

      const userPool = await UserPoolClientService.create(
        mockClientsDataStore,
        clock,
        () =>
          Promise.resolve({
            set,
            get: jest.fn(),
            getRoot: jest.fn(),
          }),
        { Id: "local", UsernameAttributes: [] },
        MockLogger
      );

      await userPool.saveUser({
        Username: "user-supplied",
        Password: "hunter3",
        UserStatus: "UNCONFIRMED",
        Attributes: [
          { Name: "sub", Value: "uuid-1234" },
          { Name: "email", Value: "example@example.com" },
        ],
        UserLastModifiedDate: now,
        UserCreateDate: now,
        Enabled: true,
      });

      expect(set).toHaveBeenCalledWith(["Users", "user-supplied"], {
        Username: "user-supplied",
        Password: "hunter3",
        UserStatus: "UNCONFIRMED",
        Attributes: [
          { Name: "sub", Value: "uuid-1234" },
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

        beforeEach(async () => {
          const options = {
            Id: "local",
            UsernameAttributes: username_attributes,
          };
          const users: Record<string, User> = {
            "user-supplied": {
              Username: "user-supplied",
              Password: "hunter3",
              UserStatus: "UNCONFIRMED",
              Attributes: [
                { Name: "sub", Value: "uuid-1234" },
                { Name: "email", Value: "example@example.com" },
                { Name: "phone_number", Value: "0411000111" },
              ],
              UserLastModifiedDate: Math.floor(new Date().getTime() / 1000),
              UserCreateDate: Math.floor(new Date().getTime() / 1000),
              Enabled: true,
            },
          };

          const get = jest.fn((key) => {
            if (key === "Users") {
              return Promise.resolve(users);
            } else if (key === "Options") {
              return Promise.resolve(options);
            } else if (Array.isArray(key) && key[0] === "Users") {
              return Promise.resolve(users[key[1]]);
            }

            return Promise.resolve(null);
          });

          userPool = await UserPoolClientService.create(
            mockClientsDataStore,
            clock,
            () =>
              Promise.resolve({
                set: jest.fn(),
                get,
                getRoot: jest.fn(),
              }),
            options,
            MockLogger
          );
        });

        it("returns null if user doesn't exist", async () => {
          const user = await userPool.getUserByUsername("invalid");

          expect(user).toBeNull();
        });

        it("returns existing user by their username", async () => {
          const user = await userPool.getUserByUsername("user-supplied");

          expect(user).not.toBeNull();
          expect(user?.Username).toEqual("user-supplied");
        });

        it("returns existing user by their sub", async () => {
          const user = await userPool.getUserByUsername("uuid-1234");

          expect(user).not.toBeNull();
          expect(user?.Username).toEqual("user-supplied");
        });

        if (find_by_email) {
          it("returns existing user by their email", async () => {
            const user = await userPool.getUserByUsername(
              "example@example.com"
            );

            expect(user).not.toBeNull();
            expect(user?.Username).toEqual("user-supplied");
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
            expect(user?.Username).toEqual("user-supplied");
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
          UserLastModifiedDate: Math.floor(new Date().getTime() / 1000),
          UserCreateDate: Math.floor(new Date().getTime() / 1000),
          Enabled: true,
        },
      };

      const get = jest.fn((key) => {
        if (key === "Users") {
          return Promise.resolve(users);
        } else if (key === "Options") {
          return Promise.resolve(options);
        }

        return Promise.resolve(null);
      });
      userPool = await UserPoolClientService.create(
        mockClientsDataStore,
        clock,
        () =>
          Promise.resolve({
            set: jest.fn(),
            get,
            getRoot: jest.fn(),
          }),
        options,
        MockLogger
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
    const attributes: AttributeListType = [
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
