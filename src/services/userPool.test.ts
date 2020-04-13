import { CreateDataStore, DataStore } from "./dataStore";
import {
  attributesFromRecord,
  attributesInclude,
  attributesIncludeMatch,
  attributesToRecord,
  createUserPool,
  UserAttribute,
  UserPool,
} from "./userPool";

describe("User Pool", () => {
  let mockDataStore: jest.Mocked<DataStore>;

  beforeEach(() => {
    mockDataStore = {
      set: jest.fn(),
      get: jest.fn(),
    };
  });

  it("creates a database", async () => {
    const createDataStore = (jest.fn(
      () => mockDataStore
    ) as unknown) as CreateDataStore;
    await createUserPool(
      { UserPoolId: "local", UsernameAttributes: [] },
      createDataStore
    );

    expect(createDataStore).toHaveBeenCalledWith("local", {
      Options: { UserPoolId: "local", UsernameAttributes: [] },
      Users: {},
    });
  });

  describe("saveUser", () => {
    it("saves a user with their username as an additional attribute", async () => {
      const now = new Date().getTime();
      const userPool = await createUserPool(
        { UserPoolId: "local", UsernameAttributes: [] },
        () => Promise.resolve(mockDataStore)
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
        let userPool: UserPool;

        beforeAll(async () => {
          const options = {
            UserPoolId: "local",
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
          userPool = await createUserPool(options, () =>
            Promise.resolve(mockDataStore)
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
