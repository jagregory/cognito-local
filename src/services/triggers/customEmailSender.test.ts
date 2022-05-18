import { newMockLambda } from "../../__tests__/mockLambda";
import { TestContext } from "../../__tests__/testContext";
import { CryptoService } from "../crypto";
import { Lambda } from "../lambda";
import {
  CustomEmailSender,
  CustomEmailSenderTrigger,
} from "./customEmailSender";

describe.only("CustomEmailSender trigger", () => {
  let mockLambda: jest.Mocked<Lambda>;
  let mockCrypto: jest.Mocked<CryptoService>;
  let customEmailSender: CustomEmailSenderTrigger;

  beforeEach(() => {
    mockLambda = newMockLambda();
    mockCrypto = {
      encrypt: jest.fn(),
    } as any as jest.Mocked<CryptoService>;

    customEmailSender = CustomEmailSender({
      lambda: mockLambda,
      crypto: mockCrypto,
    });
  });

  describe("when lambda invoke fails", () => {
    it("returns null", async () => {
      mockCrypto.encrypt.mockRejectedValue(new Error("Some Encrypt Failure"));

      const message = await customEmailSender(TestContext, {
        clientId: "clientId",
        clientMetadata: undefined,
        code: "decryptedCode",
        source: "CustomEmailSender_SignUp",
        userAttributes: [],
        username: "username",
        userPoolId: "userPoolId",
      });

      expect(message).toBeNull();
    });
  });

  describe("when lambda invoke succeeds", () => {
    beforeEach(() => {
      mockCrypto.encrypt.mockResolvedValueOnce("encryptedCode");
    });

    it("invokes the trigger with the encrypted code", async () => {
      await customEmailSender(TestContext, {
        clientId: "clientId",
        clientMetadata: { client: "metadata" },
        code: "decryptedCode",
        source: "CustomEmailSender_ForgotPassword",
        userAttributes: [{ Name: "user", Value: "hello" }],
        username: "example@example.com",
        userPoolId: "userPoolId",
      });

      expect(mockLambda.invoke).toHaveBeenCalledWith(
        TestContext,
        "CustomEmailSender",
        {
          code: "encryptedCode",
          clientId: "clientId",
          clientMetadata: { client: "metadata" },
          triggerSource: "CustomEmailSender_ForgotPassword",
          userAttributes: { user: "hello" },
          username: "example@example.com",
          userPoolId: "userPoolId",
        }
      );
    });
  });
});
