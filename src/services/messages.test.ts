import { MessagesService } from "./messages";
import { Triggers } from "./triggers";
import * as TDB from "../__tests__/testDataBuilder";

describe("messages service", () => {
  const mockTriggers: jest.Mocked<Triggers> = {
    customMessage: jest.fn(),
    enabled: jest.fn(),
    postConfirmation: jest.fn(),
    userMigration: jest.fn(),
  };

  const user = TDB.user();

  describe("authentication", () => {
    describe("CustomMessage lambda is configured", () => {
      describe("lambda returns a custom message", () => {
        it("returns the custom message and code", async () => {
          mockTriggers.enabled.mockImplementation((name) => {
            return name === "CustomMessage";
          });
          mockTriggers.customMessage.mockResolvedValue({
            smsMessage: "sms",
            emailSubject: "email subject",
            emailMessage: "email",
          });

          const messages = new MessagesService(mockTriggers);
          const message = await messages.authentication(
            "clientId",
            "userPoolId",
            user,
            "1234"
          );

          expect(message).toMatchObject({
            __code: "1234",
            smsMessage: "sms",
            emailSubject: "email subject",
            emailMessage: "email",
          });

          expect(mockTriggers.customMessage).toHaveBeenCalledWith({
            clientId: "clientId",
            code: "1234",
            source: "CustomMessage_Authentication",
            userAttributes: user.Attributes,
            userPoolId: "userPoolId",
            username: user.Username,
          });
        });
      });

      describe("lambda does not return a custom message", () => {
        it("returns just the code", async () => {
          mockTriggers.enabled.mockImplementation((name) => {
            return name === "CustomMessage";
          });
          mockTriggers.customMessage.mockResolvedValue(null);

          const messages = new MessagesService(mockTriggers);
          const message = await messages.authentication(
            "clientId",
            "userPoolId",
            user,
            "1234"
          );

          expect(message).toMatchObject({
            __code: "1234",
          });

          expect(mockTriggers.customMessage).toHaveBeenCalledWith({
            clientId: "clientId",
            code: "1234",
            source: "CustomMessage_Authentication",
            userAttributes: user.Attributes,
            userPoolId: "userPoolId",
            username: user.Username,
          });
        });
      });
    });

    describe("CustomMessage lambda is not configured", () => {
      it("returns just the code", async () => {
        mockTriggers.enabled.mockReturnValue(false);

        const messages = new MessagesService(mockTriggers);
        const message = await messages.authentication(
          "clientId",
          "userPoolId",
          user,
          "1234"
        );

        expect(message).toMatchObject({
          __code: "1234",
        });

        expect(mockTriggers.customMessage).not.toHaveBeenCalled();
      });
    });
  });

  describe("forgotPassword", () => {
    describe("CustomMessage lambda is configured", () => {
      describe("lambda returns a custom message", () => {
        it("returns the custom message and code", async () => {
          mockTriggers.enabled.mockImplementation((name) => {
            return name === "CustomMessage";
          });
          mockTriggers.customMessage.mockResolvedValue({
            smsMessage: "sms",
            emailSubject: "email subject",
            emailMessage: "email",
          });

          const messages = new MessagesService(mockTriggers);
          const message = await messages.forgotPassword(
            "clientId",
            "userPoolId",
            user,
            "1234"
          );

          expect(message).toMatchObject({
            __code: "1234",
            smsMessage: "sms",
            emailSubject: "email subject",
            emailMessage: "email",
          });

          expect(mockTriggers.customMessage).toHaveBeenCalledWith({
            clientId: "clientId",
            code: "1234",
            source: "CustomMessage_ForgotPassword",
            userAttributes: user.Attributes,
            userPoolId: "userPoolId",
            username: user.Username,
          });
        });
      });

      describe("lambda does not return a custom message", () => {
        it("returns just the code", async () => {
          mockTriggers.enabled.mockImplementation((name) => {
            return name === "CustomMessage";
          });
          mockTriggers.customMessage.mockResolvedValue(null);

          const messages = new MessagesService(mockTriggers);
          const message = await messages.forgotPassword(
            "clientId",
            "userPoolId",
            user,
            "1234"
          );

          expect(message).toMatchObject({
            __code: "1234",
          });

          expect(mockTriggers.customMessage).toHaveBeenCalledWith({
            clientId: "clientId",
            code: "1234",
            source: "CustomMessage_ForgotPassword",
            userAttributes: user.Attributes,
            userPoolId: "userPoolId",
            username: user.Username,
          });
        });
      });
    });

    describe("CustomMessage lambda is not configured", () => {
      it("returns just the code", async () => {
        mockTriggers.enabled.mockReturnValue(false);

        const messages = new MessagesService(mockTriggers);
        const message = await messages.forgotPassword(
          "clientId",
          "userPoolId",
          user,
          "1234"
        );

        expect(message).toMatchObject({
          __code: "1234",
        });

        expect(mockTriggers.customMessage).not.toHaveBeenCalled();
      });
    });
  });

  describe("signUp", () => {
    describe("CustomMessage lambda is configured", () => {
      describe("lambda returns a custom message", () => {
        it("returns the custom message and code", async () => {
          mockTriggers.enabled.mockImplementation((name) => {
            return name === "CustomMessage";
          });
          mockTriggers.customMessage.mockResolvedValue({
            smsMessage: "sms",
            emailSubject: "email subject",
            emailMessage: "email",
          });

          const messages = new MessagesService(mockTriggers);
          const message = await messages.signUp(
            "clientId",
            "userPoolId",
            user,
            "1234"
          );

          expect(message).toMatchObject({
            __code: "1234",
            smsMessage: "sms",
            emailSubject: "email subject",
            emailMessage: "email",
          });

          expect(mockTriggers.customMessage).toHaveBeenCalledWith({
            clientId: "clientId",
            code: "1234",
            source: "CustomMessage_SignUp",
            userAttributes: user.Attributes,
            userPoolId: "userPoolId",
            username: user.Username,
          });
        });
      });

      describe("lambda does not return a custom message", () => {
        it("returns just the code", async () => {
          mockTriggers.enabled.mockImplementation((name) => {
            return name === "CustomMessage";
          });
          mockTriggers.customMessage.mockResolvedValue(null);

          const messages = new MessagesService(mockTriggers);
          const message = await messages.signUp(
            "clientId",
            "userPoolId",
            user,
            "1234"
          );

          expect(message).toMatchObject({
            __code: "1234",
          });

          expect(mockTriggers.customMessage).toHaveBeenCalledWith({
            clientId: "clientId",
            code: "1234",
            source: "CustomMessage_SignUp",
            userAttributes: user.Attributes,
            userPoolId: "userPoolId",
            username: user.Username,
          });
        });
      });
    });

    describe("CustomMessage lambda is not configured", () => {
      it("returns just the code", async () => {
        mockTriggers.enabled.mockReturnValue(false);

        const messages = new MessagesService(mockTriggers);
        const message = await messages.signUp(
          "clientId",
          "userPoolId",
          user,
          "1234"
        );

        expect(message).toMatchObject({
          __code: "1234",
        });

        expect(mockTriggers.customMessage).not.toHaveBeenCalled();
      });
    });
  });
});
