import { advanceTo } from "jest-date-mock";
import { MockLogger } from "../__tests__/mockLogger";
import { UUID } from "../__tests__/patterns";
import { UsernameExistsError } from "../errors";
import {
  CognitoClient,
  MessageDelivery,
  Messages,
  Triggers,
  UserPoolClient,
} from "../services";
import { SignUp, SignUpTarget } from "./signUp";

describe("SignUp target", () => {
  let signUp: SignUpTarget;
  let mockCognitoClient: jest.Mocked<CognitoClient>;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;
  let mockMessageDelivery: jest.Mocked<MessageDelivery>;
  let mockMessages: jest.Mocked<Messages>;
  let mockOtp: jest.MockedFunction<() => string>;
  let mockTriggers: jest.Mocked<Triggers>;
  let now: Date;

  beforeEach(() => {
    now = new Date(2020, 1, 2, 3, 4, 5);
    advanceTo(now);

    mockUserPoolClient = {
      config: {
        Id: "test",
      },
      createAppClient: jest.fn(),
      getUserByUsername: jest.fn(),
      listUsers: jest.fn(),
      saveUser: jest.fn(),
    };
    mockCognitoClient = {
      getAppClient: jest.fn(),
      getUserPool: jest.fn().mockResolvedValue(mockUserPoolClient),
      getUserPoolForClientId: jest.fn().mockResolvedValue(mockUserPoolClient),
    };
    mockMessageDelivery = {
      deliver: jest.fn(),
    };
    mockMessages = {
      authentication: jest.fn(),
      forgotPassword: jest.fn(),
      signUp: jest.fn().mockResolvedValue({
        emailSubject: "Mock message",
      }),
    };
    mockOtp = jest.fn();
    mockTriggers = {
      customMessage: jest.fn(),
      enabled: jest.fn(),
      postConfirmation: jest.fn(),
      userMigration: jest.fn(),
    };

    signUp = SignUp(
      {
        cognitoClient: mockCognitoClient,
        messageDelivery: mockMessageDelivery,
        messages: mockMessages,
        otp: mockOtp,
        triggers: mockTriggers,
      },
      MockLogger
    );
  });

  it("throws if user already exists", async () => {
    mockUserPoolClient.getUserByUsername.mockResolvedValue({
      Attributes: [],
      Enabled: true,
      Password: "hunter2",
      UserCreateDate: Math.floor(now.getTime() / 1000),
      UserLastModifiedDate: Math.floor(now.getTime() / 1000),
      UserStatus: "CONFIRMED",
      Username: "user-supplied",
    });

    await expect(
      signUp({
        ClientId: "clientId",
        Password: "pwd",
        Username: "user-supplied",
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
      UserCreateDate: Math.floor(now.getTime() / 1000),
      UserLastModifiedDate: Math.floor(now.getTime() / 1000),
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

    expect(mockMessageDelivery.deliver).toHaveBeenCalledWith(
      {
        Attributes: [
          { Name: "sub", Value: expect.stringMatching(UUID) },
          { Name: "email", Value: "example@example.com" },
        ],
        Enabled: true,
        Password: "pwd",
        UserCreateDate: Math.floor(now.getTime() / 1000),
        UserLastModifiedDate: Math.floor(now.getTime() / 1000),
        UserStatus: "UNCONFIRMED",
        Username: "user-supplied",
      },
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
      UserCreateDate: Math.floor(now.getTime() / 1000),
      UserLastModifiedDate: Math.floor(now.getTime() / 1000),
      UserStatus: "UNCONFIRMED",
      Username: "user-supplied",
    });
  });
});
