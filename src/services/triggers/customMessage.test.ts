import { MockLogger } from "../../__tests__/mockLogger";
import { MockUserPoolClient } from "../../__tests__/mockUserPoolClient";
import { CognitoClient } from "../cognitoClient";
import { Lambda } from "../lambda";
import { UserPoolClient } from "../userPoolClient";
import { CustomMessage, CustomMessageTrigger } from "./customMessage";

describe("CustomMessage trigger", () => {
  let mockLambda: jest.Mocked<Lambda>;
  let mockCognitoClient: jest.Mocked<CognitoClient>;
  let customMessage: CustomMessageTrigger;

  beforeEach(() => {
    mockLambda = {
      enabled: jest.fn(),
      invoke: jest.fn(),
    };
    mockCognitoClient = {
      getAppClient: jest.fn(),
      getUserPool: jest.fn().mockResolvedValue(MockUserPoolClient),
      getUserPoolForClientId: jest.fn().mockResolvedValue(MockUserPoolClient),
    };

    customMessage = CustomMessage(
      {
        lambda: mockLambda,
        cognitoClient: mockCognitoClient,
      },
      MockLogger
    );
  });

  describe("when lambda invoke fails", () => {
    it("returns null", async () => {
      mockLambda.invoke.mockRejectedValue(new Error("Something bad happened"));

      const message = await customMessage({
        clientId: "clientId",
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
    it("saves user with attributes from response", async () => {
      mockLambda.invoke.mockResolvedValue({
        emailMessage: "email message",
        emailSubject: "email subject",
        smsMessage: "sms message",
      });

      const message = await customMessage({
        clientId: "clientId",
        code: "1234",
        source: "CustomMessage_ForgotPassword",
        userAttributes: [],
        username: "example@example.com",
        userPoolId: "userPoolId",
      });

      expect(mockLambda.invoke).toHaveBeenCalledWith("CustomMessage", {
        clientId: "clientId",
        code: "1234",
        triggerSource: "CustomMessage_ForgotPassword",
        userAttributes: {},
        username: "example@example.com",
        userPoolId: "userPoolId",
      });

      expect(message).not.toBeNull();
      expect(message?.emailMessage).toEqual("email message");
      expect(message?.emailSubject).toEqual("email subject");
      expect(message?.smsMessage).toEqual("sms message");
    });
  });
});
