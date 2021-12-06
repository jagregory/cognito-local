import { newMockLambda } from "../../__tests__/mockLambda";
import { TestContext } from "../../__tests__/testContext";
import { Lambda } from "../lambda";
import { PreSignUp, PreSignUpTrigger } from "./preSignUp";

describe("PreSignUp trigger", () => {
  let mockLambda: jest.Mocked<Lambda>;
  let preSignUp: PreSignUpTrigger;

  beforeEach(() => {
    mockLambda = newMockLambda();
    preSignUp = PreSignUp({
      lambda: mockLambda,
    });
  });

  describe.each([
    "PreSignUp_AdminCreateUser",
    "PreSignUp_ExternalProvider",
    "PreSignUp_SignUp",
  ] as const)("%s", (source) => {
    describe("when lambda invoke fails", () => {
      it("throws", async () => {
        mockLambda.invoke.mockRejectedValue(
          new Error("Something bad happened")
        );

        await expect(
          preSignUp(TestContext, {
            clientId: "clientId",
            clientMetadata: undefined,
            source,
            userAttributes: [],
            username: "username",
            userPoolId: "userPoolId",
            validationData: undefined,
          })
        ).rejects.toEqual(new Error("Something bad happened"));
      });
    });

    describe("when lambda invoke succeeds", () => {
      it("quietly completes", async () => {
        mockLambda.invoke.mockResolvedValue({});

        await preSignUp(TestContext, {
          clientMetadata: {
            client: "metadata",
          },
          userPoolId: "userPoolId",
          clientId: "clientId",
          username: "example@example.com",
          userAttributes: [{ Name: "email", Value: "example@example.com" }],
          source: source,
          validationData: {
            validation: "data",
          },
        });

        expect(mockLambda.invoke).toHaveBeenCalledWith(
          TestContext,
          "PreSignUp",
          {
            clientId: "clientId",
            clientMetadata: {
              client: "metadata",
            },
            triggerSource: source,
            userAttributes: { email: "example@example.com" },
            userPoolId: "userPoolId",
            username: "example@example.com",
            validationData: {
              validation: "data",
            },
          }
        );
      });
    });
  });
});
