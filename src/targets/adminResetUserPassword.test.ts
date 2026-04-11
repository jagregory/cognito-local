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
  AdminResetUserPassword,
  type AdminResetUserPasswordTarget,
} from "./adminResetUserPassword";

const currentDate = new Date();

describe("AdminResetUserPassword target", () => {
  let adminResetUserPassword: AdminResetUserPasswordTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;
  let mockMessages: MockedObject<Messages>;
  let mockOtp: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    mockMessages = newMockMessages();
    mockOtp = vi.fn().mockReturnValue("123456");

    adminResetUserPassword = AdminResetUserPassword({
      cognito: newMockCognitoService(mockUserPoolService),
      clock: new ClockFake(currentDate),
      messages: mockMessages,
      otp: mockOtp,
    });
  });

  it("sets UserStatus to RESET_REQUIRED and delivers message", async () => {
    const user = TDB.user({
      Username: "testuser",
      Attributes: [
        { Name: "email", Value: "user@example.com" },
        { Name: "sub", Value: "user-sub" },
      ],
    });
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    const result = await adminResetUserPassword(TestContext, {
      UserPoolId: "test",
      Username: "testuser",
    });

    expect(result).toEqual({});
    expect(mockMessages.deliver).toHaveBeenCalledWith(
      TestContext,
      "ForgotPassword",
      null,
      "test",
      user,
      "123456",
      undefined,
      expect.objectContaining({
        AttributeName: "email",
        DeliveryMedium: "EMAIL",
        Destination: "user@example.com",
      }),
    );
    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...user,
      UserStatus: "RESET_REQUIRED",
      ConfirmationCode: "123456",
      UserLastModifiedDate: currentDate,
    });
  });

  it("throws if user not found", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      adminResetUserPassword(TestContext, {
        UserPoolId: "test",
        Username: "unknown",
      }),
    ).rejects.toBeInstanceOf(UserNotFoundError);

    expect(mockUserPoolService.saveUser).not.toHaveBeenCalled();
  });
});
