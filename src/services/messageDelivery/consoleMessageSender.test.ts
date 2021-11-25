import { MockLogger } from "../../__tests__/mockLogger";
import { attributeValue } from "../userPoolClient";
import { ConsoleMessageSender } from "./consoleMessageSender";
import * as TDB from "../../__tests__/testDataBuilder";

describe("consoleMessageSender", () => {
  const user = TDB.user();
  const destination = "example@example.com";
  const mockLog = MockLogger;
  const sender = new ConsoleMessageSender(mockLog);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe.each(["sendEmail", "sendSms"] as const)("%s", (fn) => {
    it("prints the message to the console", async () => {
      await sender[fn](user, destination, {
        __code: "1234",
      });

      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`Username:\\s+${user.Username}`))
      );
      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringMatching(/Destination:\s+example@example.com/)
      );
      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringMatching(/Code:\s+1234/)
      );
    });

    it("doesn't print undefined fields", async () => {
      await sender[fn](user, destination, {
        __code: "1234",
        emailMessage: undefined,
      });

      expect(mockLog.info).not.toHaveBeenCalledWith(
        expect.stringMatching(/Email Message/)
      );
    });

    it("prints additional fields", async () => {
      await sender[fn](user, destination, {
        __code: "1234",
        emailMessage: "this is the email message",
      });

      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringMatching(/Email Message:\s+this is the email message/)
      );
    });
  });
});
