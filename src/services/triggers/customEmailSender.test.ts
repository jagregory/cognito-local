import {
  beforeEach,
  describe,
  expect,
  it,
  type MockedObject,
  vi,
} from "vitest";
import { newMockLambda } from "../../__tests__/mockLambda";
import { TestContext } from "../../__tests__/testContext";
import type { CryptoService } from "../crypto";
import type { Lambda } from "../lambda";
import {
  CustomEmailSender,
  type CustomEmailSenderTrigger,
} from "./customEmailSender";

describe("CustomEmailSender trigger", () => {
  let mockLambda: MockedObject<Lambda>;
  let mockCrypto: MockedObject<CryptoService>;
  let customEmailSender: CustomEmailSenderTrigger;

  beforeEach(() => {
    mockLambda = newMockLambda();
    mockCrypto = {
      encrypt: vi.fn(),
    } as any as MockedObject<CryptoService>;

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
        },
      );
    });
  });
});
