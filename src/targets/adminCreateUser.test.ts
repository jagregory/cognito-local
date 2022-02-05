import { MockClock } from "../mocks/MockClock";
import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockMessages } from "../mocks/MockMessages";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { UUID } from "../mocks";
import { MockContext } from "../mocks/MockContext";
import { InvalidParameterError, UsernameExistsError } from "../errors";
import { Messages, UserPoolService } from "../services";
import { AdminCreateUser, AdminCreateUserTarget } from "./adminCreateUser";
import { MockUser } from "../mocks/MockUser";

const originalDate = new Date();

describe("AdminCreateUser target", () => {
  let adminCreateUser: AdminCreateUserTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let mockMessages: jest.Mocked<Messages>;

  beforeEach(() => {
    mockUserPoolService = MockUserPoolService();
    mockMessages = MockMessages();
    adminCreateUser = AdminCreateUser({
      cognito: MockCognitoService(mockUserPoolService),
      clock: new MockClock(originalDate),
      messages: mockMessages,
    });
  });

  it("saves a new user with a provided temporary password", async () => {
    await adminCreateUser(MockContext, {
      TemporaryPassword: "pwd",
      UserAttributes: [
        { Name: "email", Value: "example@example.com" },
        { Name: "phone_number", Value: "0400000000" },
      ],
      Username: "user-supplied",
      UserPoolId: "test",
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(MockContext, {
      Attributes: [
        {
          Name: "sub",
          Value: expect.stringMatching(UUID),
        },
        { Name: "email", Value: "example@example.com" },
        { Name: "phone_number", Value: "0400000000" },
      ],
      Enabled: true,
      Password: "pwd",
      UserCreateDate: originalDate,
      UserLastModifiedDate: originalDate,
      UserStatus: "FORCE_CHANGE_PASSWORD",
      Username: "user-supplied",
      RefreshTokens: [],
    });
  });

  it("saves a new user with a generated temporary password", async () => {
    await adminCreateUser(MockContext, {
      UserAttributes: [
        { Name: "email", Value: "example@example.com" },
        { Name: "phone_number", Value: "0400000000" },
      ],
      Username: "user-supplied",
      UserPoolId: "test",
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(MockContext, {
      Attributes: [
        {
          Name: "sub",
          Value: expect.stringMatching(UUID),
        },
        { Name: "email", Value: "example@example.com" },
        { Name: "phone_number", Value: "0400000000" },
      ],
      Enabled: true,
      Password: expect.stringMatching(/^[A-Za-z0-9!]{6}$/),
      UserCreateDate: originalDate,
      UserLastModifiedDate: originalDate,
      UserStatus: "FORCE_CHANGE_PASSWORD",
      Username: "user-supplied",
      RefreshTokens: [],
    });
  });

  describe("messages", () => {
    describe("DesiredDeliveryMediums=EMAIL", () => {
      it("sends a welcome email to the user", async () => {
        const response = await adminCreateUser(MockContext, {
          ClientMetadata: {
            client: "metadata",
          },
          DesiredDeliveryMediums: ["EMAIL"],
          TemporaryPassword: "pwd",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
          Username: "user-supplied",
          UserPoolId: "test",
        });

        expect(mockMessages.deliver).toHaveBeenCalledWith(
          MockContext,
          "AdminCreateUser",
          null,
          "test",
          { ...response.User, Password: "pwd", RefreshTokens: [] },
          "pwd",
          {
            client: "metadata",
          },
          {
            AttributeName: "email",
            DeliveryMedium: "EMAIL",
            Destination: "example@example.com",
          }
        );
      });

      it("fails for user without email attribute", async () => {
        await expect(
          adminCreateUser(MockContext, {
            DesiredDeliveryMediums: ["EMAIL"],
            TemporaryPassword: "pwd",
            UserAttributes: [],
            Username: "user-supplied",
            UserPoolId: "test",
          })
        ).rejects.toEqual(
          new InvalidParameterError(
            "User has no attribute matching desired delivery mediums"
          )
        );

        expect(mockMessages.deliver).not.toHaveBeenCalled();
      });
    });

    describe("DesiredDeliveryMediums=SMS", () => {
      it("sends a welcome sms to the user", async () => {
        const response = await adminCreateUser(MockContext, {
          ClientMetadata: {
            client: "metadata",
          },
          DesiredDeliveryMediums: ["SMS"],
          TemporaryPassword: "pwd",
          UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
          Username: "user-supplied",
          UserPoolId: "test",
        });

        expect(mockMessages.deliver).toHaveBeenCalledWith(
          MockContext,
          "AdminCreateUser",
          null,
          "test",
          { ...response.User, Password: "pwd", RefreshTokens: [] },
          "pwd",
          {
            client: "metadata",
          },
          {
            AttributeName: "phone_number",
            DeliveryMedium: "SMS",
            Destination: "0400000000",
          }
        );
      });

      it("fails for user without phone_number attribute", async () => {
        await expect(
          adminCreateUser(MockContext, {
            DesiredDeliveryMediums: ["SMS"],
            TemporaryPassword: "pwd",
            UserAttributes: [],
            Username: "user-supplied",
            UserPoolId: "test",
          })
        ).rejects.toEqual(
          new InvalidParameterError(
            "User has no attribute matching desired delivery mediums"
          )
        );

        expect(mockMessages.deliver).not.toHaveBeenCalled();
      });
    });

    describe("DesiredDeliveryMediums=default", () => {
      it("sends a welcome sms to the user", async () => {
        const response = await adminCreateUser(MockContext, {
          ClientMetadata: {
            client: "metadata",
          },
          TemporaryPassword: "pwd",
          UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
          Username: "user-supplied",
          UserPoolId: "test",
        });

        expect(mockMessages.deliver).toHaveBeenCalledWith(
          MockContext,
          "AdminCreateUser",
          null,
          "test",
          { ...response.User, Password: "pwd", RefreshTokens: [] },
          "pwd",
          {
            client: "metadata",
          },
          {
            AttributeName: "phone_number",
            DeliveryMedium: "SMS",
            Destination: "0400000000",
          }
        );
      });

      it("fails for user without phone_number attribute", async () => {
        await expect(
          adminCreateUser(MockContext, {
            ClientMetadata: {
              client: "metadata",
            },
            TemporaryPassword: "pwd",
            UserAttributes: [],
            Username: "user-supplied",
            UserPoolId: "test",
          })
        ).rejects.toEqual(
          new InvalidParameterError(
            "User has no attribute matching desired delivery mediums"
          )
        );

        expect(mockMessages.deliver).not.toHaveBeenCalled();
      });
    });

    describe("DesiredDeliveryMediums=EMAIL and SMS", () => {
      it("sends a welcome sms to a user with a phone_number and an email", async () => {
        const response = await adminCreateUser(MockContext, {
          ClientMetadata: {
            client: "metadata",
          },
          DesiredDeliveryMediums: ["EMAIL", "SMS"],
          TemporaryPassword: "pwd",
          UserAttributes: [
            { Name: "email", Value: "example@example.com" },
            { Name: "phone_number", Value: "0400000000" },
          ],
          Username: "user-supplied",
          UserPoolId: "test",
        });

        expect(mockMessages.deliver).toHaveBeenCalledWith(
          MockContext,
          "AdminCreateUser",
          null,
          "test",
          { ...response.User, Password: "pwd", RefreshTokens: [] },
          "pwd",
          {
            client: "metadata",
          },
          {
            AttributeName: "phone_number",
            DeliveryMedium: "SMS",
            Destination: "0400000000",
          }
        );
      });

      it("sends a welcome email to a user without a phone_number but with an email", async () => {
        const response = await adminCreateUser(MockContext, {
          ClientMetadata: {
            client: "metadata",
          },
          DesiredDeliveryMediums: ["EMAIL", "SMS"],
          TemporaryPassword: "pwd",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
          Username: "user-supplied",
          UserPoolId: "test",
        });

        expect(mockMessages.deliver).toHaveBeenCalledWith(
          MockContext,
          "AdminCreateUser",
          null,
          "test",
          { ...response.User, Password: "pwd", RefreshTokens: [] },
          "pwd",
          {
            client: "metadata",
          },
          {
            AttributeName: "email",
            DeliveryMedium: "EMAIL",
            Destination: "example@example.com",
          }
        );
      });

      it("fails for users without phone_number or email", async () => {
        await expect(
          adminCreateUser(MockContext, {
            DesiredDeliveryMediums: ["EMAIL", "SMS"],
            TemporaryPassword: "pwd",
            UserAttributes: [],
            Username: "user-supplied",
            UserPoolId: "test",
          })
        ).rejects.toEqual(
          new InvalidParameterError(
            "User has no attribute matching desired delivery mediums"
          )
        );

        expect(mockMessages.deliver).not.toHaveBeenCalled();
      });
    });
  });

  it.todo("can create an alias to an existing user");
  it.todo("can resend the welcome message");
  it.todo("can suppress the welcome message");

  it("handles creating a duplicate user", async () => {
    const existingUser = MockUser();
    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    await expect(
      adminCreateUser(MockContext, {
        TemporaryPassword: "pwd",
        UserAttributes: existingUser.Attributes,
        Username: existingUser.Username,
        UserPoolId: "test",
      })
    ).rejects.toEqual(new UsernameExistsError());
  });

  it.todo("invokes the PreSignUp lambda");
});
