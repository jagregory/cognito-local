import { MockMessageDelivery } from "../mocks/MockMessageDelivery";
import { MockTriggers } from "../mocks/MockTriggers";
import { MockContext } from "../mocks/MockContext";
import { MessageDelivery } from "./messageDelivery/messageDelivery";
import { MessagesService } from "./messages";
import { Triggers } from "./triggers";
import { MockUser } from "../mocks/MockUser";

describe("messages service", () => {
  let mockTriggers: jest.Mocked<Triggers>;
  let mockMessageDelivery: jest.Mocked<MessageDelivery>;

  const user = MockUser();
  const deliveryDetails = {
    AttributeName: "email",
    DeliveryMedium: "EMAIL",
    Destination: "example@example.com",
  } as const;

  beforeEach(() => {
    mockTriggers = MockTriggers();
    mockMessageDelivery = MockMessageDelivery();
  });

  describe.each([
    "AdminCreateUser",
    "Authentication",
    "ForgotPassword",
    "ResendCode",
    "SignUp",
    "UpdateUserAttribute",
    "VerifyUserAttribute",
  ] as const)("%s", (source) => {
    describe("CustomMessage lambda is configured", () => {
      describe("lambda returns a custom message", () => {
        it("delivers the customised message", async () => {
          mockTriggers.enabled.mockImplementation((name) => {
            return name === "CustomMessage";
          });
          mockTriggers.customMessage.mockResolvedValue({
            smsMessage: "sms",
            emailSubject: "email subject",
            emailMessage: "email",
          });

          const messages = new MessagesService(
            mockTriggers,
            mockMessageDelivery
          );
          await messages.deliver(
            MockContext,
            source,
            "clientId",
            "userPoolId",
            user,
            "1234",
            {
              client: "metadata",
            },
            deliveryDetails
          );

          expect(mockTriggers.customMessage).toHaveBeenCalledWith(MockContext, {
            clientId: "clientId",
            clientMetadata: {
              client: "metadata",
            },
            code: "1234",
            source: `CustomMessage_${source}`,
            userAttributes: user.Attributes,
            userPoolId: "userPoolId",
            username: user.Username,
          });

          expect(mockMessageDelivery.deliver).toHaveBeenCalledWith(
            MockContext,
            user,
            deliveryDetails,
            {
              __code: "1234",
              emailMessage: "email",
              emailSubject: "email subject",
              smsMessage: "sms",
            }
          );
        });
      });

      describe("lambda does not return a custom message", () => {
        it("delivers just the code", async () => {
          mockTriggers.enabled.mockImplementation((name) => {
            return name === "CustomMessage";
          });
          mockTriggers.customMessage.mockResolvedValue(null);

          const messages = new MessagesService(
            mockTriggers,
            mockMessageDelivery
          );
          await messages.deliver(
            MockContext,
            source,
            "clientId",
            "userPoolId",
            user,
            "1234",
            {
              client: "metadata",
            },
            deliveryDetails
          );

          expect(mockTriggers.customMessage).toHaveBeenCalledWith(MockContext, {
            clientId: "clientId",
            clientMetadata: {
              client: "metadata",
            },
            code: "1234",
            source: `CustomMessage_${source}`,
            userAttributes: user.Attributes,
            userPoolId: "userPoolId",
            username: user.Username,
          });

          expect(mockMessageDelivery.deliver).toHaveBeenCalledWith(
            MockContext,
            user,
            deliveryDetails,
            {
              __code: "1234",
            }
          );
        });
      });
    });

    describe("CustomMessage lambda is not configured", () => {
      it("delivers just the code", async () => {
        mockTriggers.enabled.mockReturnValue(false);

        const messages = new MessagesService(mockTriggers, mockMessageDelivery);
        await messages.deliver(
          MockContext,
          source,
          "clientId",
          "userPoolId",
          user,
          "1234",
          {
            client: "metadata",
          },
          deliveryDetails
        );

        expect(mockTriggers.customMessage).not.toHaveBeenCalled();
        expect(mockMessageDelivery.deliver).toHaveBeenCalledWith(
          MockContext,
          user,
          deliveryDetails,
          {
            __code: "1234",
          }
        );
      });
    });
  });
});
