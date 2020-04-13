import { NotAuthorizedError } from "../../errors";
import { Lambda } from "../lambda";
import { UserPool } from "../userPool";
import { PostConfirmation, PostConfirmationTrigger } from "./postConfirmation";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

describe("PostConfirmation trigger", () => {
  let mockLambda: jest.Mocked<Lambda>;
  let mockUserPool: jest.Mocked<UserPool>;
  let postConfirmation: PostConfirmationTrigger;

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

    postConfirmation = PostConfirmation({
      lambda: mockLambda,
      userPool: mockUserPool,
    });
  });

  describe.each([
    "PostConfirmation_ConfirmSignUp",
    "PostConfirmation_ConfirmForgotPassword",
  ])("%s", (source) => {
    describe("when lambda invoke fails", () => {
      it("quietly completes", async () => {
        mockLambda.invoke.mockRejectedValue(
          new Error("Something bad happened")
        );

        await postConfirmation({
          userPoolId: "userPoolId",
          clientId: "clientId",
          username: "username",
          userAttributes: [],
          source: source as any,
        });
      });
    });

    describe("when lambda invoke succeeds", () => {
      it("quietly completes", async () => {
        mockLambda.invoke.mockResolvedValue({});

        await postConfirmation({
          userPoolId: "userPoolId",
          clientId: "clientId",
          username: "example@example.com",
          userAttributes: [{ Name: "email", Value: "example@example.com" }],
          source: source as any,
        });

        expect(mockLambda.invoke).toHaveBeenCalledWith("PostConfirmation", {
          clientId: "clientId",
          triggerSource: source,
          userAttributes: { email: "example@example.com" },
          userPoolId: "userPoolId",
          username: "example@example.com",
        });
      });
    });
  });
});
