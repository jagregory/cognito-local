import { MockContext } from "../../mocks/MockContext";
import { MockUser } from "../../mocks/MockUser";
import { ConsoleMessageSender } from "./consoleMessageSender";

describe("consoleMessageSender", () => {
  const user = MockUser();
  const destination = "example@example.com";
  const sender = new ConsoleMessageSender();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe.each(["sendEmail", "sendSms"] as const)("%s", (fn) => {
    it("prints the message to the console", async () => {
      await sender[fn](MockContext, user, destination, {
        __code: "1234",
      });

      expect(MockContext.logger.info).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`Username:\\s+${user.Username}`))
      );
      expect(MockContext.logger.info).toHaveBeenCalledWith(
        expect.stringMatching(/Destination:\s+example@example.com/)
      );
      expect(MockContext.logger.info).toHaveBeenCalledWith(
        expect.stringMatching(/Code:\s+1234/)
      );
    });

    it("doesn't print undefined fields", async () => {
      await sender[fn](MockContext, user, destination, {
        __code: "1234",
        emailMessage: undefined,
      });

      expect(MockContext.logger.info).not.toHaveBeenCalledWith(
        expect.stringMatching(/Email Message/)
      );
    });

    it("prints additional fields", async () => {
      await sender[fn](MockContext, user, destination, {
        __code: "1234",
        emailMessage: "this is the email message",
      });

      expect(MockContext.logger.info).toHaveBeenCalledWith(
        expect.stringMatching(/Email Message:\s+this is the email message/)
      );
    });
  });
});
