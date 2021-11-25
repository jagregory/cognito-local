import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoClient } from "../__tests__/mockCognitoClient";
import { MockLogger } from "../__tests__/mockLogger";
import { newMockMessageDelivery } from "../__tests__/mockMessageDelivery";
import { newMockMessages } from "../__tests__/mockMessages";
import { newMockUserPoolClient } from "../__tests__/mockUserPoolClient";
import { UUID } from "../__tests__/patterns";
import * as TDB from "../__tests__/testDataBuilder";
import { UsernameExistsError } from "../errors";
import { MessageDelivery, Messages, UserPoolClient } from "../services";
import { SignUp, SignUpTarget } from "./signUp";

describe("SignUp target", () => {
  let signUp: SignUpTarget;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;
  let mockMessageDelivery: jest.Mocked<MessageDelivery>;
  let mockMessages: jest.Mocked<Messages>;
  let mockOtp: jest.MockedFunction<() => string>;
  let now: Date;

  beforeEach(() => {
    now = new Date(2020, 1, 2, 3, 4, 5);

    mockUserPoolClient = newMockUserPoolClient();
    mockMessageDelivery = newMockMessageDelivery();
    mockMessages = newMockMessages();
    mockMessages.signUp.mockResolvedValue({
      emailSubject: "Mock message",
    });
    mockOtp = jest.fn();
    signUp = SignUp(
      {
        cognitoClient: newMockCognitoClient(mockUserPoolClient),
        clock: new ClockFake(now),
        messageDelivery: mockMessageDelivery,
        messages: mockMessages,
        otp: mockOtp,
      },
      MockLogger
    );
  });

  it("throws if user already exists", async () => {
    const user = TDB.user();

    mockUserPoolClient.getUserByUsername.mockResolvedValue(user);

    await expect(
      signUp({
        ClientId: "clientId",
        Password: "pwd",
        Username: user.Username,
        UserAttributes: [],
      })
    ).rejects.toBeInstanceOf(UsernameExistsError);
  });

  it("saves a new user", async () => {
    mockUserPoolClient.getUserByUsername.mockResolvedValue(null);

    await signUp({
      ClientId: "clientId",
      Password: "pwd",
      Username: "user-supplied",
      UserAttributes: [{ Name: "email", Value: "example@example.com" }],
    });

    expect(mockUserPoolClient.saveUser).toHaveBeenCalledWith({
      Attributes: [
        {
          Name: "sub",
          Value: expect.stringMatching(UUID),
        },
        { Name: "email", Value: "example@example.com" },
      ],
      Enabled: true,
      Password: "pwd",
      UserCreateDate: now.getTime(),
      UserLastModifiedDate: now.getTime(),
      UserStatus: "UNCONFIRMED",
      Username: "user-supplied",
    });
  });

  it("sends a confirmation code to the user's email address", async () => {
    mockUserPoolClient.getUserByUsername.mockResolvedValue(null);
    mockOtp.mockReturnValue("1234");

    await signUp({
      ClientId: "clientId",
      Password: "pwd",
      Username: "user-supplied",
      UserAttributes: [{ Name: "email", Value: "example@example.com" }],
    });

    const createdUser = {
      Attributes: [
        { Name: "sub", Value: expect.stringMatching(UUID) },
        { Name: "email", Value: "example@example.com" },
      ],
      Enabled: true,
      Password: "pwd",
      UserCreateDate: now.getTime(),
      UserLastModifiedDate: now.getTime(),
      UserStatus: "UNCONFIRMED",
      Username: "user-supplied",
    };

    expect(mockMessages.signUp).toHaveBeenCalledWith(
      "clientId",
      "test",
      createdUser,
      "1234"
    );
    expect(mockMessageDelivery.deliver).toHaveBeenCalledWith(
      createdUser,
      {
        AttributeName: "email",
        DeliveryMedium: "EMAIL",
        Destination: "example@example.com",
      },
      { emailSubject: "Mock message" }
    );
  });

  it("saves the confirmation code on the user for comparison when confirming", async () => {
    mockUserPoolClient.getUserByUsername.mockResolvedValue(null);
    mockOtp.mockReturnValue("1234");

    await signUp({
      ClientId: "clientId",
      Password: "pwd",
      Username: "user-supplied",
      UserAttributes: [{ Name: "email", Value: "example@example.com" }],
    });

    expect(mockUserPoolClient.saveUser).toHaveBeenCalledWith({
      Attributes: [
        { Name: "sub", Value: expect.stringMatching(UUID) },
        { Name: "email", Value: "example@example.com" },
      ],
      ConfirmationCode: "1234",
      Enabled: true,
      Password: "pwd",
      UserCreateDate: now.getTime(),
      UserLastModifiedDate: now.getTime(),
      UserStatus: "UNCONFIRMED",
      Username: "user-supplied",
    });
  });
});
