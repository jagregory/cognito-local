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
        })
      ).rejects.toBeInstanceOf(NotAuthorizedError);
    });
  });

  describe("when lambda invoke succeeds", () => {
    it("saves user", async () => {
      mockLambda.invoke.mockResolvedValue({});

      const user = await userMigration({
        userPoolId: "userPoolId",
        clientId: "clientId",
        username: "example@example.com",
        password: "password",
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
      });

      expect(user).not.toBeNull();
      expect(user.UserStatus).toEqual("RESET_REQUIRED");
    });
  });
});
