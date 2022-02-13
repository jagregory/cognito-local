import { MockContext } from "../../mocks/MockContext";
import { User } from "../userPoolService";
import { MessageDeliveryService } from "./messageDelivery";
import { MessageSender } from "./messageSender";

describe("Message Delivery", () => {
  const user: User = {
    Username: "1",
    UserStatus: "CONFIRMED",
    Attributes: [],
    Password: "hunter2",
    Enabled: true,
    UserCreateDate: new Date(),
    UserLastModifiedDate: new Date(),
    RefreshTokens: [],
  };

  describe("when delivery method is EMAIL", () => {
    it("sends a code via email", async () => {
      const sender: jest.Mocked<MessageSender> = {
        sendEmail: jest.fn(),
        sendSms: jest.fn(),
      };
      const message = {
        emailSubject: "Subject",
        emailMessage: "Body",
      };
      const messageDelivery = new MessageDeliveryService(sender);

      await messageDelivery.deliver(
        MockContext,
        user,
        {
          Destination: "example@example.com",
          DeliveryMedium: "EMAIL",
          AttributeName: "email",
        },
        message
      );

      expect(sender.sendEmail).toHaveBeenCalledWith(
        MockContext,
        user,
        "example@example.com",
        message
      );
      expect(sender.sendSms).not.toHaveBeenCalled();
    });
  });

  describe("when delivery method is SMS", () => {
    it("sends a code via SMS", async () => {
      const sender: jest.Mocked<MessageSender> = {
        sendEmail: jest.fn(),
        sendSms: jest.fn(),
      };
      const message = {
        emailSubject: "Subject",
        emailMessage: "Body",
      };
      const messageDelivery = new MessageDeliveryService(sender);

      await messageDelivery.deliver(
        MockContext,
        user,
        {
          Destination: "0123445670",
          DeliveryMedium: "SMS",
          AttributeName: "phone_number",
        },
        message
      );

      expect(sender.sendSms).toHaveBeenCalledWith(
        MockContext,
        user,
        "0123445670",
        message
      );
      expect(sender.sendEmail).not.toHaveBeenCalled();
    });
  });
});
