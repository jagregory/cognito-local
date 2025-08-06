import { describe, expect, it, type MockedObject, vi } from "vitest";
import { TestContext } from "../../__tests__/testContext";
import type { User } from "../userPoolService";
import { MessageDeliveryService } from "./messageDelivery";
import type { MessageSender } from "./messageSender";

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
      const sender: MockedObject<MessageSender> = {
        sendEmail: vi.fn(),
        sendSms: vi.fn(),
      };
      const message = {
        emailSubject: "Subject",
        emailMessage: "Body",
      };
      const messageDelivery = new MessageDeliveryService(sender);

      await messageDelivery.deliver(
        TestContext,
        user,
        {
          Destination: "example@example.com",
          DeliveryMedium: "EMAIL",
          AttributeName: "email",
        },
        message,
      );

      expect(sender.sendEmail).toHaveBeenCalledWith(
        TestContext,
        user,
        "example@example.com",
        message,
      );
      expect(sender.sendSms).not.toHaveBeenCalled();
    });
  });

  describe("when delivery method is SMS", () => {
    it("sends a code via SMS", async () => {
      const sender: MockedObject<MessageSender> = {
        sendEmail: vi.fn(),
        sendSms: vi.fn(),
      };
      const message = {
        emailSubject: "Subject",
        emailMessage: "Body",
      };
      const messageDelivery = new MessageDeliveryService(sender);

      await messageDelivery.deliver(
        TestContext,
        user,
        {
          Destination: "0123445670",
          DeliveryMedium: "SMS",
          AttributeName: "phone_number",
        },
        message,
      );

      expect(sender.sendSms).toHaveBeenCalledWith(
        TestContext,
        user,
        "0123445670",
        message,
      );
      expect(sender.sendEmail).not.toHaveBeenCalled();
    });
  });
});
