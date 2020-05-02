import { advanceTo } from "jest-date-mock";
import { UsernameExistsError } from "../errors";
import { CognitoClient, UserPoolClient } from "../services";
import { Triggers } from "../services/triggers";
import { SignUp, SignUpTarget } from "./signUp";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

describe("SignUp target", () => {
  let signUp: SignUpTarget;
  let mockCognitoClient: jest.Mocked<CognitoClient>;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;
  let mockCodeDelivery: jest.Mock;
  let mockTriggers: jest.Mocked<Triggers>;
  let now: Date;

  beforeEach(() => {
    now = new Date(2020, 1, 2, 3, 4, 5);
    advanceTo(now);

    mockUserPoolClient = {
      id: "test",
      getUserByUsername: jest.fn(),
      listUsers: jest.fn(),
      saveUser: jest.fn(),
    };
    mockCognitoClient = {
      getUserPool: jest.fn().mockResolvedValue(mockUserPoolClient),
      getUserPoolForClientId: jest.fn().mockResolvedValue(mockUserPoolClient),
    };
    mockCodeDelivery = jest.fn();
    mockTriggers = {
      enabled: jest.fn(),
      postConfirmation: jest.fn(),
      userMigration: jest.fn(),
    };

    signUp = SignUp({
      cognitoClient: mockCognitoClient,
      codeDelivery: mockCodeDelivery,
      triggers: mockTriggers,
    });
  });

  it("throws if user already exists", async () => {
    mockUserPoolClient.getUserByUsername.mockResolvedValue({
      Attributes: [],
      Enabled: true,
      Password: "hunter2",
      UserCreateDate: now.getTime(),
      UserLastModifiedDate: now.getTime(),
      UserStatus: "CONFIRMED",
      Username: "0000-0000",
    });

    await expect(
      signUp({
        ClientId: "clientId",
        Password: "pwd",
        Username: "0000-0000",
        UserAttributes: [],
      })
    ).rejects.toBeInstanceOf(UsernameExistsError);
  });

  it("saves a new user", async () => {
    mockUserPoolClient.getUserByUsername.mockResolvedValue(null);

    await signUp({
      ClientId: "clientId",
      Password: "pwd",
      Username: "0000-0000",
      UserAttributes: [],
    });

    expect(mockUserPoolClient.saveUser).toHaveBeenCalledWith({
      Attributes: [],
      Enabled: true,
      Password: "pwd",
      UserCreateDate: now.getTime(),
      UserLastModifiedDate: now.getTime(),
      UserStatus: "UNCONFIRMED",
      Username: expect.stringMatching(UUID),
    });
  });

  it("sends a confirmation code to the user's email address", async () => {
    mockUserPoolClient.getUserByUsername.mockResolvedValue(null);
    mockCodeDelivery.mockResolvedValue("1234");

    await signUp({
      ClientId: "clientId",
      Password: "pwd",
      Username: "0000-0000",
      UserAttributes: [{ Name: "email", Value: "example@example.com" }],
    });

    expect(mockCodeDelivery).toHaveBeenCalledWith(
      {
        Attributes: [{ Name: "email", Value: "example@example.com" }],
        Enabled: true,
        Password: "pwd",
        UserCreateDate: now.getTime(),
        UserLastModifiedDate: now.getTime(),
        UserStatus: "UNCONFIRMED",
        Username: expect.stringMatching(UUID),
      },
      {
        AttributeName: "email",
        DeliveryMedium: "EMAIL",
        Destination: "example@example.com",
      }
    );
  });

  it("saves the confirmation code on the user for comparison when confirming", async () => {
    mockUserPoolClient.getUserByUsername.mockResolvedValue(null);
    mockCodeDelivery.mockResolvedValue("1234");

    await signUp({
      ClientId: "clientId",
      Password: "pwd",
      Username: "0000-0000",
      UserAttributes: [{ Name: "email", Value: "example@example.com" }],
    });

    expect(mockUserPoolClient.saveUser).toHaveBeenCalledWith({
      Attributes: [{ Name: "email", Value: "example@example.com" }],
      ConfirmationCode: "1234",
      Enabled: true,
      Password: "pwd",
      UserCreateDate: now.getTime(),
      UserLastModifiedDate: now.getTime(),
      UserStatus: "UNCONFIRMED",
      Username: expect.stringMatching(UUID),
    });
  });
});
