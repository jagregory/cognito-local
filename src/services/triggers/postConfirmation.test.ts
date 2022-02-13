import { MockLambda } from "../../mocks/MockLambda";
import { MockContext } from "../../mocks/MockContext";
import { Lambda } from "../lambda";
import { PostConfirmation, PostConfirmationTrigger } from "./postConfirmation";

describe("PostConfirmation trigger", () => {
  let mockLambda: jest.Mocked<Lambda>;
  let postConfirmation: PostConfirmationTrigger;

  beforeEach(() => {
    mockLambda = MockLambda();
    postConfirmation = PostConfirmation({
      lambda: mockLambda,
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

        await postConfirmation(MockContext, {
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

        await postConfirmation(MockContext, {
          userPoolId: "userPoolId",
          clientId: "clientId",
          username: "example@example.com",
          userAttributes: [{ Name: "email", Value: "example@example.com" }],
          source: source as any,
        });

        expect(mockLambda.invoke).toHaveBeenCalledWith(
          MockContext,
          "PostConfirmation",
          {
            clientId: "clientId",
            triggerSource: source,
            userAttributes: { email: "example@example.com" },
            userPoolId: "userPoolId",
            username: "example@example.com",
          }
        );
      });
    });
  });
});
