import { newMockTriggers } from "../__tests__/mockTriggers";
import { MessagesService } from "./messages";
import * as TDB from "../__tests__/testDataBuilder";
import { Triggers } from "./triggers";

describe("messages service", () => {
  let mockTriggers: jest.Mocked<Triggers>;

  const user = TDB.user();

  beforeEach(() => {
    mockTriggers = newMockTriggers();
  });

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
            "1234",
            {
              client: "metadata",
            }
          );

          expect(message).toMatchObject({
            __code: "1234",
            smsMessage: "sms",
            emailSubject: "email subject",
            emailMessage: "email",
          });

          expect(mockTriggers.customMessage).toHaveBeenCalledWith({
            clientId: "clientId",
            clientMetadata: {
              client: "metadata",
            },
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
            "1234",
            {
              client: "metadata",
            }
          );

          expect(message).toMatchObject({
            __code: "1234",
          });

          expect(mockTriggers.customMessage).toHaveBeenCalledWith({
            clientId: "clientId",
            clientMetadata: {
              client: "metadata",
            },
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
          "1234",
          {
            client: "metadata",
          }
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
            "1234",
            {
              client: "metadata",
            }
          );

          expect(message).toMatchObject({
            __code: "1234",
            smsMessage: "sms",
            emailSubject: "email subject",
            emailMessage: "email",
          });

          expect(mockTriggers.customMessage).toHaveBeenCalledWith({
            clientId: "clientId",
            clientMetadata: {
              client: "metadata",
            },
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
            "1234",
            {
              client: "metadata",
            }
          );

          expect(message).toMatchObject({
            __code: "1234",
          });

          expect(mockTriggers.customMessage).toHaveBeenCalledWith({
            clientId: "clientId",
            clientMetadata: {
              client: "metadata",
            },
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
          "1234",
          {
            client: "metadata",
          }
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
            "1234",
            {
              client: "metadata",
            }
          );

          expect(message).toMatchObject({
            __code: "1234",
            smsMessage: "sms",
            emailSubject: "email subject",
            emailMessage: "email",
          });

          expect(mockTriggers.customMessage).toHaveBeenCalledWith({
            clientId: "clientId",
            clientMetadata: {
              client: "metadata",
            },
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
            "1234",
            {
              client: "metadata",
            }
          );

          expect(message).toMatchObject({
            __code: "1234",
          });

          expect(mockTriggers.customMessage).toHaveBeenCalledWith({
            clientId: "clientId",
            clientMetadata: {
              client: "metadata",
            },
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
          "1234",
          {
            client: "metadata",
          }
        );

        expect(message).toMatchObject({
          __code: "1234",
        });

        expect(mockTriggers.customMessage).not.toHaveBeenCalled();
      });
    });
  });
});
