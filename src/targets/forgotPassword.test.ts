import { ClockFake } from "../__tests__/clockFake";
import { MockUserPoolClient } from "../__tests__/mockUserPoolClient";
import { UserNotFoundError } from "../errors";
import { CognitoClient, Messages, MessageDelivery } from "../services";
import { ForgotPassword, ForgotPasswordTarget } from "./forgotPassword";

describe("ForgotPassword target", () => {
  let forgotPassword: ForgotPasswordTarget;
  let mockCognitoClient: jest.Mocked<CognitoClient>;
  let mockMessageDelivery: jest.Mocked<MessageDelivery>;
  let mockMessages: jest.Mocked<Messages>;
  let mockOtp: jest.MockedFunction<() => string>;
  let now: Date;

  beforeEach(() => {
    now = new Date(2020, 1, 2, 3, 4, 5);

    mockCognitoClient = {
      getAppClient: jest.fn(),
      getUserPool: jest.fn().mockResolvedValue(MockUserPoolClient),
      getUserPoolForClientId: jest.fn().mockResolvedValue(MockUserPoolClient),
    };
    mockMessageDelivery = {
      deliver: jest.fn(),
    };
    mockMessages = {
      authentication: jest.fn(),
      forgotPassword: jest.fn().mockResolvedValue({
        emailSubject: "Mock message",
      }),
      signUp: jest.fn(),
    };
    mockOtp = jest.fn().mockReturnValue("1234");

    forgotPassword = ForgotPassword({
      cognitoClient: mockCognitoClient,
      clock: new ClockFake(now),
      messageDelivery: mockMessageDelivery,
      messages: mockMessages,
      otp: mockOtp,
    });
  });

  it("throws if user doesn't exist", async () => {
    MockUserPoolClient.getUserByUsername.mockResolvedValue(null);

    await expect(
      forgotPassword({
        ClientId: "clientId",
        Username: "0000-0000",
      })
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it("sends a confirmation code to the user's email address", async () => {
    MockUserPoolClient.getUserByUsername.mockResolvedValue({
      Attributes: [{ Name: "email", Value: "example@example.com" }],
      Enabled: true,
      Password: "hunter2",
      UserCreateDate: now.getTime(),
      UserLastModifiedDate: now.getTime(),
      UserStatus: "CONFIRMED",
      Username: "0000-0000",
    });

    const result = await forgotPassword({
      ClientId: "clientId",
      Username: "0000-0000",
    });

    expect(mockMessageDelivery.deliver).toHaveBeenCalledWith(
      {
        Attributes: [{ Name: "email", Value: "example@example.com" }],
        Enabled: true,
        Password: "hunter2",
        UserCreateDate: now.getTime(),
        UserLastModifiedDate: now.getTime(),
        UserStatus: "CONFIRMED",
        Username: "0000-0000",
      },
      {
        AttributeName: "email",
        DeliveryMedium: "EMAIL",
        Destination: "example@example.com",
      },
      { emailSubject: "Mock message" }
    );

    expect(result).toEqual({
      CodeDeliveryDetails: {
        AttributeName: "email",
        DeliveryMedium: "EMAIL",
        Destination: "example@example.com",
      },
    });
  });

  it("saves the confirmation code on the user for comparison when confirming", async () => {
    MockUserPoolClient.getUserByUsername.mockResolvedValue({
      Attributes: [{ Name: "email", Value: "example@example.com" }],
      Enabled: true,
      Password: "hunter2",
      UserCreateDate: now.getTime(),
      UserLastModifiedDate: now.getTime(),
      UserStatus: "CONFIRMED",
      Username: "0000-0000",
    });

    await forgotPassword({
      ClientId: "clientId",
      Username: "0000-0000",
    });

    expect(MockUserPoolClient.saveUser).toHaveBeenCalledWith({
      Attributes: [{ Name: "email", Value: "example@example.com" }],
      ConfirmationCode: "1234",
      Enabled: true,
      Password: "hunter2",
      UserCreateDate: now.getTime(),
      UserLastModifiedDate: now.getTime(),
      // TODO: validate whether an already confirmed user should stay confirmed when password reset starts?
      UserStatus: "CONFIRMED",
      Username: "0000-0000",
    });
  });
});
