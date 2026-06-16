import { beforeEach, describe, expect, it, vi, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockMessages } from "../__tests__/mockMessages";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { UserNotFoundError } from "../errors";
import type { Messages, UserPoolService } from "../services";
import {
  ResendConfirmationCode,
  type ResendConfirmationCodeTarget,
} from "./resendConfirmationCode";

const currentDate = new Date();

describe("ResendConfirmationCode target", () => {
  let resendConfirmationCode: ResendConfirmationCodeTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;
  let mockMessages: MockedObject<Messages>;
  let mockOtp: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService({
      Id: "test",
      AutoVerifiedAttributes: ["email"],
    });
    mockMessages = newMockMessages();
    mockOtp = vi.fn().mockReturnValue("123456");

    resendConfirmationCode = ResendConfirmationCode({
      cognito: newMockCognitoService(mockUserPoolService),
      clock: new ClockFake(currentDate),
      messages: mockMessages,
      otp: mockOtp,
    });
  });

  it("generates code, delivers message, saves on user", async () => {
    const user = TDB.user({
      Attributes: [
        { Name: "email", Value: "user@example.com" },
        { Name: "sub", Value: "user-sub" },
      ],
    });
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    const result = await resendConfirmationCode(TestContext, {
      ClientId: "test-client",
      Username: user.Username,
    });

    expect(result.CodeDeliveryDetails).toBeDefined();
    expect(mockMessages.deliver).toHaveBeenCalledWith(
      TestContext,
      "ResendCode",
      "test-client",
      "test",
      user,
      "123456",
      undefined,
      expect.objectContaining({ AttributeName: "email", DeliveryMedium: "EMAIL" }),
    );
    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...user,
      ConfirmationCode: "123456",
      UserLastModifiedDate: currentDate,
    });
  });

  it("throws if user not found", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      resendConfirmationCode(TestContext, {
        ClientId: "test-client",
        Username: "unknown",
      }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });
});
