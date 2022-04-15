import { newMockLambda } from "../../__tests__/mockLambda";
import { TestContext } from "../../__tests__/testContext";
import { Lambda } from "../lambda";
import { CustomMessage, CustomMessageTrigger } from "./customMessage";

describe("CustomMessage trigger", () => {
  let mockLambda: jest.Mocked<Lambda>;
  let customMessage: CustomMessageTrigger;

  beforeEach(() => {
    mockLambda = newMockLambda();
    customMessage = CustomMessage({
      lambda: mockLambda,
    });
  });

  describe("when lambda invoke fails", () => {
    it("returns null", async () => {
      mockLambda.invoke.mockRejectedValue(new Error("Something bad happened"));

      const message = await customMessage(TestContext, {
        clientId: "clientId",
        clientMetadata: undefined,
        code: "123456",
        source: "CustomMessage_ForgotPassword",
        userAttributes: [],
        username: "username",
        userPoolId: "userPoolId",
      });

      expect(message).toBeNull();
    });
  });

  describe("when lambda invoke succeeds", () => {
    it("returns a message with the code and username interpolated", async () => {
      mockLambda.invoke.mockResolvedValue({
        emailMessage: "hi {username} your code is {####}. via email",
        emailSubject: "email subject",
        smsMessage: "hi {username} your code is {####}. via sms",
      });

      const message = await customMessage(TestContext, {
        clientId: "clientId",
        clientMetadata: {
          client: "metadata",
        },
        code: "123456",
        source: "CustomMessage_ForgotPassword",
        userAttributes: [{ Name: "user", Value: "attribute" }],
        username: "example@example.com",
        userPoolId: "userPoolId",
      });

      expect(mockLambda.invoke).toHaveBeenCalledWith(
        TestContext,
        "CustomMessage",
        {
          clientId: "clientId",
          clientMetadata: {
            client: "metadata",
          },
          codeParameter: "{####}",
          triggerSource: "CustomMessage_ForgotPassword",
          userAttributes: {
            user: "attribute",
          },
          username: "example@example.com",
          usernameParameter: "{username}",
          userPoolId: "userPoolId",
        }
      );

      expect(message).not.toBeNull();
      expect(message?.emailMessage).toEqual(
        "hi example@example.com your code is 123456. via email"
      );
      expect(message?.emailSubject).toEqual("email subject");
      expect(message?.smsMessage).toEqual(
        "hi example@example.com your code is 123456. via sms"
      );
    });
  });
});
