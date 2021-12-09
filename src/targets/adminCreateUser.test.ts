import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockMessageDelivery } from "../__tests__/mockMessageDelivery";
import { newMockMessages } from "../__tests__/mockMessages";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { UUID } from "../__tests__/patterns";
import { TestContext } from "../__tests__/testContext";
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
    await adminCreateUser(TestContext, {
      TemporaryPassword: "pwd",
      UserAttributes: [
        { Name: "email", Value: "example@example.com" },
        { Name: "phone_number", Value: "0400000000" },
      ],
      Username: "user-supplied",
      UserPoolId: "test",
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
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
    await adminCreateUser(TestContext, {
      UserAttributes: [
        { Name: "email", Value: "example@example.com" },
        { Name: "phone_number", Value: "0400000000" },
      ],
      Username: "user-supplied",
      UserPoolId: "test",
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
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
        mockMessages.create.mockResolvedValue({
          emailMessage: "email message",
          emailSubject: "email subject",
        });

        const response = await adminCreateUser(TestContext, {
          ClientMetadata: {
            client: "metadata",
          },
          DesiredDeliveryMediums: ["EMAIL"],
          TemporaryPassword: "pwd",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
          Username: "user-supplied",
          UserPoolId: "test",
        });

        expect(mockMessages.create).toHaveBeenCalledWith(
          TestContext,
          "AdminCreateUser",
          null,
          "test",
          { ...response.User, Password: "pwd", RefreshTokens: [] },
          "pwd",
          {
            client: "metadata",
          }
        );
        expect(mockMessageDelivery.deliver).toHaveBeenCalledWith(
          TestContext,
          {
            ...response.User,
            Password: "pwd",
            RefreshTokens: [],
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
          adminCreateUser(TestContext, {
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

        expect(mockMessages.create).not.toHaveBeenCalled();
        expect(mockMessageDelivery.deliver).not.toHaveBeenCalled();
      });
    });

    describe("DesiredDeliveryMediums=SMS", () => {
      it("sends a welcome sms to the user", async () => {
        mockMessages.create.mockResolvedValue({
          smsMessage: "sms message",
        });

        const response = await adminCreateUser(TestContext, {
          ClientMetadata: {
            client: "metadata",
          },
          DesiredDeliveryMediums: ["SMS"],
          TemporaryPassword: "pwd",
          UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
          Username: "user-supplied",
          UserPoolId: "test",
        });

        expect(mockMessages.create).toHaveBeenCalledWith(
          TestContext,
          "AdminCreateUser",
          null,
          "test",
          { ...response.User, Password: "pwd", RefreshTokens: [] },
          "pwd",
          {
            client: "metadata",
          }
        );
        expect(mockMessageDelivery.deliver).toHaveBeenCalledWith(
          TestContext,
          {
            ...response.User,
            Password: "pwd",
            RefreshTokens: [],
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
          adminCreateUser(TestContext, {
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

        expect(mockMessages.create).not.toHaveBeenCalled();
        expect(mockMessageDelivery.deliver).not.toHaveBeenCalled();
      });
    });

    describe("DesiredDeliveryMediums=default", () => {
      it("sends a welcome sms to the user", async () => {
        mockMessages.create.mockResolvedValue({
          smsMessage: "sms message",
        });

        const response = await adminCreateUser(TestContext, {
          ClientMetadata: {
            client: "metadata",
          },
          TemporaryPassword: "pwd",
          UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
          Username: "user-supplied",
          UserPoolId: "test",
        });

        expect(mockMessages.create).toHaveBeenCalledWith(
          TestContext,
          "AdminCreateUser",
          null,
          "test",
          { ...response.User, Password: "pwd", RefreshTokens: [] },
          "pwd",
          {
            client: "metadata",
          }
        );
        expect(mockMessageDelivery.deliver).toHaveBeenCalledWith(
          TestContext,
          {
            ...response.User,
            Password: "pwd",
            RefreshTokens: [],
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
          adminCreateUser(TestContext, {
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

        expect(mockMessages.create).not.toHaveBeenCalled();
        expect(mockMessageDelivery.deliver).not.toHaveBeenCalled();
      });
    });

    describe("DesiredDeliveryMediums=EMAIL and SMS", () => {
      it("sends a welcome sms to a user with a phone_number and an email", async () => {
        mockMessages.create.mockResolvedValue({
          smsMessage: "sms message",
        });

        const response = await adminCreateUser(TestContext, {
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

        expect(mockMessages.create).toHaveBeenCalledWith(
          TestContext,
          "AdminCreateUser",
          null,
          "test",
          { ...response.User, Password: "pwd", RefreshTokens: [] },
          "pwd",
          {
            client: "metadata",
          }
        );
        expect(mockMessageDelivery.deliver).toHaveBeenCalledWith(
          TestContext,
          {
            ...response.User,
            Password: "pwd",
            RefreshTokens: [],
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
        mockMessages.create.mockResolvedValue({
          emailMessage: "email message",
          emailSubject: "email subject",
        });

        const response = await adminCreateUser(TestContext, {
          ClientMetadata: {
            client: "metadata",
          },
          DesiredDeliveryMediums: ["EMAIL", "SMS"],
          TemporaryPassword: "pwd",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
          Username: "user-supplied",
          UserPoolId: "test",
        });

        expect(mockMessages.create).toHaveBeenCalledWith(
          TestContext,
          "AdminCreateUser",
          null,
          "test",
          { ...response.User, Password: "pwd", RefreshTokens: [] },
          "pwd",
          {
            client: "metadata",
          }
        );
        expect(mockMessageDelivery.deliver).toHaveBeenCalledWith(
          TestContext,
          {
            ...response.User,
            Password: "pwd",
            RefreshTokens: [],
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
          adminCreateUser(TestContext, {
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

        expect(mockMessages.create).not.toHaveBeenCalled();
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
      adminCreateUser(TestContext, {
        TemporaryPassword: "pwd",
        UserAttributes: existingUser.Attributes,
        Username: existingUser.Username,
        UserPoolId: "test",
      })
    ).rejects.toEqual(new UsernameExistsError());
  });

  it.todo("invokes the PreSignUp lambda");
});
