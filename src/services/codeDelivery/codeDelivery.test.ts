import { createCodeDelivery } from "./codeDelivery";
import { CodeSender } from "./codeSender";

describe("Code Delivery", () => {
  const user = {
    id: "1",
    confirmed: false,
    username: "janice",
    attributes: [],
    password: "hunter2",
  };

  describe("when delivery method is EMAIL", () => {
    it("sends a code via email", async () => {
      const sender: jest.Mocked<CodeSender> = {
        sendEmail: jest.fn(),
        sendSms: jest.fn(),
      };
      const otp = () => "1234";
      const codeDelivery = createCodeDelivery(sender, otp);

      const code = await codeDelivery(user, {
        Destination: "example@example.com",
        DeliveryMedium: "EMAIL",
        AttributeName: "email",
      });

      expect(sender.sendEmail).toHaveBeenCalledWith(
        user,
        "example@example.com",
        "1234"
      );
      expect(sender.sendSms).not.toHaveBeenCalled();
      expect(code).toBe("1234");
    });
  });

  describe("when delivery method is SMS", () => {
    it("sends a code via SMS", async () => {
      const sender: jest.Mocked<CodeSender> = {
        sendEmail: jest.fn(),
        sendSms: jest.fn(),
      };
      const otp = () => "1234";
      const codeDelivery = createCodeDelivery(sender, otp);

      const code = await codeDelivery(user, {
        Destination: "0123445670",
        DeliveryMedium: "SMS",
        AttributeName: "phone",
      });

      expect(sender.sendSms).toHaveBeenCalledWith(user, "0123445670", "1234");
      expect(sender.sendEmail).not.toHaveBeenCalled();
      expect(code).toBe("1234");
    });
  });
});
