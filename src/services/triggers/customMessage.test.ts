import { newMockCognitoService } from "../../__tests__/mockCognitoService";
import { newMockLambda } from "../../__tests__/mockLambda";
import { MockLogger } from "../../__tests__/mockLogger";
import { newMockUserPoolService } from "../../__tests__/mockUserPoolService";
import { Lambda } from "../lambda";
import { UserPoolService } from "../userPoolService";
import { CustomMessage, CustomMessageTrigger } from "./customMessage";

describe("CustomMessage trigger", () => {
  let mockLambda: jest.Mocked<Lambda>;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let customMessage: CustomMessageTrigger;

  beforeEach(() => {
    mockLambda = newMockLambda();
    mockUserPoolService = newMockUserPoolService();
    customMessage = CustomMessage(
      {
        lambda: mockLambda,
        cognitoClient: newMockCognitoService(mockUserPoolService),
      },
      MockLogger
    );
  });

  describe("when lambda invoke fails", () => {
    it("returns null", async () => {
      mockLambda.invoke.mockRejectedValue(new Error("Something bad happened"));

      const message = await customMessage({
        clientId: "clientId",
        clientMetadata: undefined,
        code: "1234",
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

      const message = await customMessage({
        clientId: "clientId",
        clientMetadata: {
          client: "metadata",
        },
        code: "1234",
        source: "CustomMessage_ForgotPassword",
        userAttributes: [{ Name: "user", Value: "attribute" }],
        username: "example@example.com",
        userPoolId: "userPoolId",
      });

      expect(mockLambda.invoke).toHaveBeenCalledWith("CustomMessage", {
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
      });

      expect(message).not.toBeNull();
      expect(message?.emailMessage).toEqual(
        "hi example@example.com your code is 1234. via email"
      );
      expect(message?.emailSubject).toEqual("email subject");
      expect(message?.smsMessage).toEqual(
        "hi example@example.com your code is 1234. via sms"
      );
    });
  });
});
