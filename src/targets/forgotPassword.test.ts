import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoClient } from "../__tests__/mockCognitoClient";
import { newMockMessageDelivery } from "../__tests__/mockMessageDelivery";
import { newMockMessages } from "../__tests__/mockMessages";
import { newMockUserPoolClient } from "../__tests__/mockUserPoolClient";
import { UserNotFoundError } from "../errors";
import { MessageDelivery, Messages, UserPoolClient } from "../services";
import { attributeValue } from "../services/userPoolClient";
import { ForgotPassword, ForgotPasswordTarget } from "./forgotPassword";
import * as TDB from "../__tests__/testDataBuilder";

describe("ForgotPassword target", () => {
  let forgotPassword: ForgotPasswordTarget;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;
  let mockMessageDelivery: jest.Mocked<MessageDelivery>;
  let mockMessages: jest.Mocked<Messages>;
  let mockOtp: jest.MockedFunction<() => string>;

  beforeEach(() => {
    mockUserPoolClient = newMockUserPoolClient();
    mockMessageDelivery = newMockMessageDelivery();
    mockMessages = newMockMessages();
    mockMessages.forgotPassword.mockResolvedValue({
      emailSubject: "Mock message",
    });
    mockOtp = jest.fn().mockReturnValue("1234");
    forgotPassword = ForgotPassword({
      cognitoClient: newMockCognitoClient(mockUserPoolClient),
      clock: new ClockFake(new Date()),
      messageDelivery: mockMessageDelivery,
      messages: mockMessages,
      otp: mockOtp,
    });
  });

  it("throws if user doesn't exist", async () => {
    mockUserPoolClient.getUserByUsername.mockResolvedValue(null);

    await expect(
      forgotPassword({
        ClientId: "clientId",
        Username: "0000-0000",
      })
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it("sends a confirmation code to the user's email address", async () => {
    const user = TDB.user();

    mockUserPoolClient.getUserByUsername.mockResolvedValue(user);

    const result = await forgotPassword({
      ClientId: "clientId",
      Username: user.Username,
    });

    expect(mockMessageDelivery.deliver).toHaveBeenCalledWith(
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

    mockUserPoolClient.getUserByUsername.mockResolvedValue(user);

    await forgotPassword({
      ClientId: "clientId",
      Username: user.Username,
    });

    expect(mockUserPoolClient.saveUser).toHaveBeenCalledWith({
      ...user,
      ConfirmationCode: "1234",
    });
  });
});
