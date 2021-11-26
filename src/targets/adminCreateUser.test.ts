import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockMessageDelivery } from "../__tests__/mockMessageDelivery";
import { newMockMessages } from "../__tests__/mockMessages";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { UUID } from "../__tests__/patterns";
import * as TDB from "../__tests__/testDataBuilder";
import { InvalidParameterError, UsernameExistsError } from "../errors";
import { MessageDelivery, Messages, UserPoolService } from "../services";
import { AdminCreateUser, AdminCreateUserTarget } from "./adminCreateUser";

const originalDate = new Date();

describe("AdminCreateUser target", () => {
  let adminCreateUser: AdminCreateUserTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let mockMessageDelivery: jest.Mocked<MessageDelivery>;
  let mockMessages: jest.Mocked<Messages>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    mockMessageDelivery = newMockMessageDelivery();
    mockMessages = newMockMessages();
    adminCreateUser = AdminCreateUser({
      cognito: newMockCognitoService(mockUserPoolService),
      clock: new ClockFake(originalDate),
      messageDelivery: mockMessageDelivery,
      messages: mockMessages,
    });
  });

  it("saves a new user with a provided temporary password", async () => {
    await adminCreateUser({
      TemporaryPassword: "pwd",
      UserAttributes: [
        { Name: "email", Value: "example@example.com" },
        { Name: "phone_number", Value: "0400000000" },
      ],
      Username: "user-supplied",
      UserPoolId: "test",
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith({
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
    });
  });

  it("saves a new user with a generated temporary password", async () => {
    await adminCreateUser({
      UserAttributes: [
        { Name: "email", Value: "example@example.com" },
        { Name: "phone_number", Value: "0400000000" },
      ],
      Username: "user-supplied",
      UserPoolId: "test",
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith({
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
    });
  });

  describe("messages", () => {
    describe("DesiredDeliveryMediums=EMAIL", () => {
      it("sends a welcome email to the user", async () => {
        mockMessages.adminCreateUser.mockResolvedValue({
          emailMessage: "email message",
          emailSubject: "email subject",
        });

        const response = await adminCreateUser({
          DesiredDeliveryMediums: ["EMAIL"],
          TemporaryPassword: "pwd",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
          Username: "user-supplied",
          UserPoolId: "test",
        });

        expect(mockMessages.adminCreateUser).toHaveBeenCalledWith(
          "test",
          { ...response.User, Password: "pwd" },
          "pwd"
        );
        expect(mockMessageDelivery.deliver).toHaveBeenCalledWith(
          {
            ...response.User,
            Password: "pwd",
          },
          {
            AttributeName: "email",
            DeliveryMedium: "EMAIL",
            Destination: "example@example.com",
          },
          { emailMessage: "email message", emailSubject: "email subject" }
        );
      });

      it("fails for user without email attribute", async () => {
        await expect(
          adminCreateUser({
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

        expect(mockMessages.adminCreateUser).not.toHaveBeenCalled();
        expect(mockMessageDelivery.deliver).not.toHaveBeenCalled();
      });
    });

    describe("DesiredDeliveryMediums=SMS", () => {
      it("sends a welcome sms to the user", async () => {
        mockMessages.adminCreateUser.mockResolvedValue({
          smsMessage: "sms message",
        });

        const response = await adminCreateUser({
          DesiredDeliveryMediums: ["SMS"],
          TemporaryPassword: "pwd",
          UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
          Username: "user-supplied",
          UserPoolId: "test",
        });

        expect(mockMessages.adminCreateUser).toHaveBeenCalledWith(
          "test",
          { ...response.User, Password: "pwd" },
          "pwd"
        );
        expect(mockMessageDelivery.deliver).toHaveBeenCalledWith(
          {
            ...response.User,
            Password: "pwd",
          },
          {
            AttributeName: "phone_number",
            DeliveryMedium: "SMS",
            Destination: "0400000000",
          },
          { smsMessage: "sms message" }
        );
      });

      it("fails for user without phone_number attribute", async () => {
        await expect(
          adminCreateUser({
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

        expect(mockMessages.adminCreateUser).not.toHaveBeenCalled();
        expect(mockMessageDelivery.deliver).not.toHaveBeenCalled();
      });
    });

    describe("DesiredDeliveryMediums=default", () => {
      it("sends a welcome sms to the user", async () => {
        mockMessages.adminCreateUser.mockResolvedValue({
          smsMessage: "sms message",
        });

        const response = await adminCreateUser({
          TemporaryPassword: "pwd",
          UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
          Username: "user-supplied",
          UserPoolId: "test",
        });

        expect(mockMessages.adminCreateUser).toHaveBeenCalledWith(
          "test",
          { ...response.User, Password: "pwd" },
          "pwd"
        );
        expect(mockMessageDelivery.deliver).toHaveBeenCalledWith(
          {
            ...response.User,
            Password: "pwd",
          },
          {
            AttributeName: "phone_number",
            DeliveryMedium: "SMS",
            Destination: "0400000000",
          },
          { smsMessage: "sms message" }
        );
      });

      it("fails for user without phone_number attribute", async () => {
        await expect(
          adminCreateUser({
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

        expect(mockMessages.adminCreateUser).not.toHaveBeenCalled();
        expect(mockMessageDelivery.deliver).not.toHaveBeenCalled();
      });
    });

    describe("DesiredDeliveryMediums=EMAIL and SMS", () => {
      it("sends a welcome sms to a user with a phone_number and an email", async () => {
        mockMessages.adminCreateUser.mockResolvedValue({
          smsMessage: "sms message",
        });

        const response = await adminCreateUser({
          DesiredDeliveryMediums: ["EMAIL", "SMS"],
          TemporaryPassword: "pwd",
          UserAttributes: [
            { Name: "email", Value: "example@example.com" },
            { Name: "phone_number", Value: "0400000000" },
          ],
          Username: "user-supplied",
          UserPoolId: "test",
        });

        expect(mockMessages.adminCreateUser).toHaveBeenCalledWith(
          "test",
          { ...response.User, Password: "pwd" },
          "pwd"
        );
        expect(mockMessageDelivery.deliver).toHaveBeenCalledWith(
          {
            ...response.User,
            Password: "pwd",
          },
          {
            AttributeName: "phone_number",
            DeliveryMedium: "SMS",
            Destination: "0400000000",
          },
          { smsMessage: "sms message" }
        );
      });

      it("sends a welcome email to a user without a phone_number but with an email", async () => {
        mockMessages.adminCreateUser.mockResolvedValue({
          emailMessage: "email message",
          emailSubject: "email subject",
        });

        const response = await adminCreateUser({
          DesiredDeliveryMediums: ["EMAIL", "SMS"],
          TemporaryPassword: "pwd",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
          Username: "user-supplied",
          UserPoolId: "test",
        });

        expect(mockMessages.adminCreateUser).toHaveBeenCalledWith(
          "test",
          { ...response.User, Password: "pwd" },
          "pwd"
        );
        expect(mockMessageDelivery.deliver).toHaveBeenCalledWith(
          {
            ...response.User,
            Password: "pwd",
          },
          {
            AttributeName: "email",
            DeliveryMedium: "EMAIL",
            Destination: "example@example.com",
          },
          { emailMessage: "email message", emailSubject: "email subject" }
        );
      });

      it("fails for users without phone_number or email", async () => {
        await expect(
          adminCreateUser({
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

        expect(mockMessages.adminCreateUser).not.toHaveBeenCalled();
        expect(mockMessageDelivery.deliver).not.toHaveBeenCalled();
      });
    });
  });

  it.todo("can create an alias to an existing user");
  it.todo("can resend the welcome message");
  it.todo("can suppress the welcome message");

  it("handles creating a duplicate user", async () => {
    const existingUser = TDB.user();
    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    await expect(
      adminCreateUser({
        TemporaryPassword: "pwd",
        UserAttributes: existingUser.Attributes,
        Username: existingUser.Username,
        UserPoolId: "test",
      })
    ).rejects.toEqual(new UsernameExistsError());
  });

  it.todo("invokes the PreSignIn lambda");
});
