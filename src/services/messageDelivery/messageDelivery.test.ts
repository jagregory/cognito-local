import { User } from "../userPoolClient";
import { MessageDeliveryService } from "./messageDelivery";
import { MessageSender } from "./messageSender";

describe("Message Delivery", () => {
  const user: User = {
    Username: "1",
    UserStatus: "CONFIRMED",
    Attributes: [],
    Password: "hunter2",
    Enabled: true,
    UserCreateDate: Math.floor(new Date().getTime() / 1000),
    UserLastModifiedDate: Math.floor(new Date().getTime() / 1000),
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
        user,
        {
          Destination: "example@example.com",
          DeliveryMedium: "EMAIL",
          AttributeName: "email",
        },
        message
      );

      expect(sender.sendEmail).toHaveBeenCalledWith(
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
        user,
        {
          Destination: "0123445670",
          DeliveryMedium: "SMS",
          AttributeName: "phone_number",
        },
        message
      );

      expect(sender.sendSms).toHaveBeenCalledWith(user, "0123445670", message);
      expect(sender.sendEmail).not.toHaveBeenCalled();
    });
  });
});
