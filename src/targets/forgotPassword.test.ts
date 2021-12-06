import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockMessageDelivery } from "../__tests__/mockMessageDelivery";
import { newMockMessages } from "../__tests__/mockMessages";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import { UserNotFoundError } from "../errors";
import { MessageDelivery, Messages, UserPoolService } from "../services";
import { attributeValue } from "../services/userPoolService";
import { ForgotPassword, ForgotPasswordTarget } from "./forgotPassword";
import * as TDB from "../__tests__/testDataBuilder";

const currentDate = new Date();

describe("ForgotPassword target", () => {
  let forgotPassword: ForgotPasswordTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let mockMessageDelivery: jest.Mocked<MessageDelivery>;
  let mockMessages: jest.Mocked<Messages>;
  let mockOtp: jest.MockedFunction<() => string>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    mockMessageDelivery = newMockMessageDelivery();
    mockMessages = newMockMessages();
    mockMessages.forgotPassword.mockResolvedValue({
      emailSubject: "Mock message",
    });
    mockOtp = jest.fn().mockReturnValue("1234");
    forgotPassword = ForgotPassword({
      cognito: newMockCognitoService(mockUserPoolService),
      clock: new ClockFake(currentDate),
      messageDelivery: mockMessageDelivery,
      messages: mockMessages,
      otp: mockOtp,
    });
  });

  it("throws if user doesn't exist", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      forgotPassword(TestContext, {
        ClientId: "clientId",
        Username: "0000-0000",
      })
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it("sends a confirmation code to the user's email address", async () => {
    const user = TDB.user();

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    const result = await forgotPassword(TestContext, {
      ClientId: "clientId",
      Username: user.Username,
    });

    expect(mockMessageDelivery.deliver).toHaveBeenCalledWith(
      TestContext,
      user,
      {
        AttributeName: "email",
        DeliveryMedium: "EMAIL",
        Destination: attributeValue("email", user.Attributes),
      },
      { emailSubject: "Mock message" }
    );

    expect(result).toEqual({
      CodeDeliveryDetails: {
        AttributeName: "email",
        DeliveryMedium: "EMAIL",
        Destination: attributeValue("email", user.Attributes),
      },
    });
  });

  it("saves the confirmation code on the user for comparison when confirming", async () => {
    const user = TDB.user();

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await forgotPassword(TestContext, {
      ClientId: "clientId",
      Username: user.Username,
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...user,
      UserLastModifiedDate: currentDate,
      ConfirmationCode: "1234",
    });
  });
});
