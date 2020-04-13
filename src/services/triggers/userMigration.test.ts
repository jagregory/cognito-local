import { NotAuthorizedError } from "../../errors";
import { Lambda } from "../lambda";
import { UserPool } from "../userPool";
import { UserMigration, UserMigrationTrigger } from "./userMigration";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

describe("UserMigration trigger", () => {
  let mockLambda: jest.Mocked<Lambda>;
  let mockUserPool: jest.Mocked<UserPool>;
  let userMigration: UserMigrationTrigger;

  beforeEach(() => {
    mockLambda = {
      enabled: jest.fn(),
      invoke: jest.fn(),
    };
    mockUserPool = {
      getUserByUsername: jest.fn(),
      getUserPoolIdForClientId: jest.fn(),
      listUsers: jest.fn(),
      saveUser: jest.fn(),
    };

    userMigration = UserMigration({
      lambda: mockLambda,
      userPool: mockUserPool,
    });
  });

  describe("when lambda invoke fails", () => {
    it("throws unauthorized error", async () => {
      mockLambda.invoke.mockRejectedValue(new Error("Something bad happened"));

      await expect(
        userMigration({
          userPoolId: "userPoolId",
          clientId: "clientId",
          username: "username",
          password: "password",
          userAttributes: [],
        })
      ).rejects.toBeInstanceOf(NotAuthorizedError);
    });
  });

  describe("when lambda invoke succeeds", () => {
    it("saves user with attributes from response", async () => {
      mockLambda.invoke.mockResolvedValue({
        userAttributes: {
          email: "example@example.com",
        },
      });

      const user = await userMigration({
        userPoolId: "userPoolId",
        clientId: "clientId",
        username: "example@example.com", // username may be an email when migration is from a login attempt
        password: "password",
        userAttributes: [], // there won't be any attributes yet because we don't know who the user is
      });

      expect(mockLambda.invoke).toHaveBeenCalledWith("UserMigration", {
        clientId: "clientId",
        password: "password",
        triggerSource: "UserMigration_Authentication",
        userAttributes: {},
        userPoolId: "userPoolId",
        username: "example@example.com",
      });

      expect(user).not.toBeNull();
      expect(user.Username).toEqual(expect.stringMatching(UUID));
      expect(user.Password).toEqual("password");
      expect(user.Attributes).toContainEqual({
        Name: "email",
        Value: "example@example.com",
      });
      expect(user.UserStatus).toEqual("CONFIRMED");
    });

    it("sets user to RESET_REQUIRED if finalUserStatus is RESET_REQUIRED in response", async () => {
      mockLambda.invoke.mockResolvedValue({
        finalUserStatus: "RESET_REQUIRED",
      });

      const user = await userMigration({
        userPoolId: "userPoolId",
        clientId: "clientId",
        username: "example@example.com",
        password: "password",
        userAttributes: [],
      });

      expect(user).not.toBeNull();
      expect(user.UserStatus).toEqual("RESET_REQUIRED");
    });
  });
});
