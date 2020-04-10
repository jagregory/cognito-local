import { advanceTo } from "jest-date-mock";
import { UsernameExistsError } from "../errors";
import { CodeDelivery, UserPool } from "../services";
import { SignUp, SignUpTarget } from "./signUp";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

describe("SignUp target", () => {
  let signUp: SignUpTarget;
  let mockDataStore: jest.Mocked<UserPool>;
  let mockCodeDelivery: jest.Mock;
  let now: Date;

  beforeEach(() => {
    now = new Date(2020, 1, 2, 3, 4, 5);
    advanceTo(now);

    mockDataStore = {
      getUserByUsername: jest.fn(),
      saveUser: jest.fn(),
    };
    mockCodeDelivery = jest.fn();

    signUp = SignUp({
      storage: mockDataStore as UserPool,
      codeDelivery: mockCodeDelivery as CodeDelivery,
    });
  });

  it("throws if user already exists", async () => {
    mockDataStore.getUserByUsername.mockResolvedValue({
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
    mockDataStore.getUserByUsername.mockResolvedValue(null);

    await signUp({
      ClientId: "clientId",
      Password: "pwd",
      Username: "0000-0000",
      UserAttributes: [],
    });

    expect(mockDataStore.saveUser).toHaveBeenCalledWith({
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
    mockDataStore.getUserByUsername.mockResolvedValue(null);
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
    mockDataStore.getUserByUsername.mockResolvedValue(null);
    mockCodeDelivery.mockResolvedValue("1234");

    await signUp({
      ClientId: "clientId",
      Password: "pwd",
      Username: "0000-0000",
      UserAttributes: [{ Name: "email", Value: "example@example.com" }],
    });

    expect(mockDataStore.saveUser).toHaveBeenCalledWith({
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
