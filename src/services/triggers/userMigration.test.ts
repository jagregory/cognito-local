import { MockCognitoService } from "../../mocks/MockCognitoService";
import { MockLambda } from "../../mocks/MockLambda";
import { MockUserPoolService } from "../../mocks/MockUserPoolService";
import { UUID } from "../../models";
import { MockContext } from "../../mocks/MockContext";
import { NotAuthorizedError } from "../../errors";
import { DateClock } from "../clock";
import { Lambda } from "../lambda";
import { UserPoolService } from "../userPoolService";
import { UserMigration, UserMigrationTrigger } from "./userMigration";

describe("UserMigration trigger", () => {
  let mockLambda: jest.Mocked<Lambda>;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let userMigration: UserMigrationTrigger;

  beforeEach(() => {
    mockLambda = MockLambda();
    mockUserPoolService = MockUserPoolService();
    userMigration = UserMigration({
      clock: new DateClock(),
      cognitoClient: MockCognitoService(mockUserPoolService),
      lambda: mockLambda,
    });
  });

  describe("when lambda invoke fails", () => {
    it("throws unauthorized error", async () => {
      mockLambda.invoke.mockRejectedValue(new Error("Something bad happened"));

      await expect(
        userMigration(MockContext, {
          clientId: "clientId",
          clientMetadata: undefined,
          password: "password",
          userAttributes: [],
          username: "username",
          userPoolId: "userPoolId",
          validationData: undefined,
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

      const user = await userMigration(MockContext, {
        clientMetadata: {
          client: "metadata",
        },
        userPoolId: "userPoolId",
        clientId: "clientId",
        username: "example@example.com", // username may be an email when migration is from a login attempt
        password: "password",
        userAttributes: [], // there won't be any attributes yet because we don't know who the user is
        validationData: {
          validation: "data",
        },
      });

      expect(mockLambda.invoke).toHaveBeenCalledWith(
        MockContext,
        "UserMigration",
        {
          clientId: "clientId",
          clientMetadata: {
            client: "metadata",
          },
          password: "password",
          triggerSource: "UserMigration_Authentication",
          userAttributes: {},
          userPoolId: "userPoolId",
          username: "example@example.com",
          validationData: {
            validation: "data",
          },
        }
      );

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

      const user = await userMigration(MockContext, {
        clientId: "clientId",
        clientMetadata: undefined,
        password: "password",
        userAttributes: [],
        username: "example@example.com",
        userPoolId: "userPoolId",
        validationData: undefined,
      });

      expect(user).not.toBeNull();
      expect(user.UserStatus).toEqual("RESET_REQUIRED");
    });
  });
});
