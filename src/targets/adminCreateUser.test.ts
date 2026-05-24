import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockMessages } from "../__tests__/mockMessages";
import { newMockTriggers } from "../__tests__/mockTriggers";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { UUID } from "../__tests__/patterns";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { InvalidParameterError, UserLambdaValidationError, UsernameExistsError } from "../errors";
import { type Config, DefaultConfig } from "../server/config";
import type { Messages, Triggers, UserPoolService } from "../services";
import { AdminCreateUser, type AdminCreateUserTarget } from "./adminCreateUser";

const originalDate = new Date();

describe("AdminCreateUser target", () => {
  let adminCreateUser: AdminCreateUserTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;
  let mockMessages: MockedObject<Messages>;
  let mockTriggers: MockedObject<Triggers>;
  let config: Config;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    mockMessages = newMockMessages();
    mockTriggers = newMockTriggers();
    config = DefaultConfig;
    adminCreateUser = AdminCreateUser({
      cognito: newMockCognitoService(mockUserPoolService),
      clock: new ClockFake(originalDate),
      config,
      messages: mockMessages,
      triggers: mockTriggers,
    });
  });

  it("saves a new user with a provided temporary password when the user pool has no username attributes", async () => {
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
        { Name: "email", Value: "example@example.com" },
        { Name: "phone_number", Value: "0400000000" },
        {
          Name: "sub",
          Value: expect.stringMatching(UUID),
        },
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

  it("saves a new user with a provided temporary password when the user pool has no username attributes", async () => {
    mockUserPoolService.options.UsernameAttributes = ["email"];

    await adminCreateUser(TestContext, {
      TemporaryPassword: "pwd",
      UserAttributes: [
        { Name: "email", Value: "example@example.com" },
        { Name: "phone_number", Value: "0400000000" },
      ],
      Username: "example@example.com",
      UserPoolId: "test",
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      Attributes: [
        { Name: "email", Value: "example@example.com" },
        { Name: "phone_number", Value: "0400000000" },
        {
          Name: "sub",
          Value: expect.stringMatching(UUID),
        },
      ],
      Enabled: true,
      Password: "pwd",
      UserCreateDate: originalDate,
      UserLastModifiedDate: originalDate,
      UserStatus: "FORCE_CHANGE_PASSWORD",
      Username: expect.stringMatching(UUID),
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
        { Name: "email", Value: "example@example.com" },
        { Name: "phone_number", Value: "0400000000" },
        {
          Name: "sub",
          Value: expect.stringMatching(UUID),
        },
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

        expect(mockMessages.deliver).toHaveBeenCalledWith(
          TestContext,
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
          },
        );
      });

      it("fails for user without email attribute", async () => {
        config.UserPoolDefaults.UsernameAttributes = [];

        await expect(
          adminCreateUser(TestContext, {
            DesiredDeliveryMediums: ["EMAIL"],
            TemporaryPassword: "pwd",
            UserAttributes: [],
            Username: "user-supplied",
            UserPoolId: "test",
          }),
        ).rejects.toEqual(
          new InvalidParameterError(
            "User has no attribute matching desired delivery mediums",
          ),
        );

        expect(mockMessages.deliver).not.toHaveBeenCalled();
      });
    });

    describe("DesiredDeliveryMediums=SMS", () => {
      it("sends a welcome sms to the user", async () => {
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

        expect(mockMessages.deliver).toHaveBeenCalledWith(
          TestContext,
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
          },
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
          }),
        ).rejects.toEqual(
          new InvalidParameterError(
            "User has no attribute matching desired delivery mediums",
          ),
        );

        expect(mockMessages.deliver).not.toHaveBeenCalled();
      });
    });

    describe("DesiredDeliveryMediums=default", () => {
      it("sends a welcome sms to the user", async () => {
        const response = await adminCreateUser(TestContext, {
          ClientMetadata: {
            client: "metadata",
          },
          TemporaryPassword: "pwd",
          UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
          Username: "user-supplied",
          UserPoolId: "test",
        });

        expect(mockMessages.deliver).toHaveBeenCalledWith(
          TestContext,
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
          },
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
          }),
        ).rejects.toEqual(
          new InvalidParameterError(
            "User has no attribute matching desired delivery mediums",
          ),
        );

        expect(mockMessages.deliver).not.toHaveBeenCalled();
      });
    });

    describe("DesiredDeliveryMediums=EMAIL and SMS", () => {
      it("sends a welcome sms to a user with a phone_number and an email", async () => {
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

        expect(mockMessages.deliver).toHaveBeenCalledWith(
          TestContext,
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
          },
        );
      });

      it("sends a welcome email to a user without a phone_number but with an email", async () => {
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

        expect(mockMessages.deliver).toHaveBeenCalledWith(
          TestContext,
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
          },
        );
      });

      it("fails for users without phone_number or email", async () => {
        config.UserPoolDefaults.UsernameAttributes = [];

        await expect(
          adminCreateUser(TestContext, {
            DesiredDeliveryMediums: ["EMAIL", "SMS"],
            TemporaryPassword: "pwd",
            UserAttributes: [],
            Username: "user-supplied",
            UserPoolId: "test",
          }),
        ).rejects.toEqual(
          new InvalidParameterError(
            "User has no attribute matching desired delivery mediums",
          ),
        );

        expect(mockMessages.deliver).not.toHaveBeenCalled();
      });
    });
  });

  it.todo("can create an alias to an existing user");
  it.todo("can resend the welcome message");

  it("can suppress the welcome message", async () => {
    await adminCreateUser(TestContext, {
      ClientMetadata: {
        client: "metadata",
      },
      MessageAction: "SUPPRESS",
      TemporaryPassword: "pwd",
      UserAttributes: [{ Name: "email", Value: "example@example.com" }],
      Username: "user-supplied",
      UserPoolId: "test",
    });

    expect(mockMessages.deliver).not.toHaveBeenCalled();

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      Attributes: [
        { Name: "email", Value: "example@example.com" },
        {
          Name: "sub",
          Value: expect.stringMatching(UUID),
        },
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

  it("handles creating a duplicate user", async () => {
    const existingUser = TDB.user();
    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    await expect(
      adminCreateUser(TestContext, {
        TemporaryPassword: "pwd",
        UserAttributes: existingUser.Attributes,
        Username: existingUser.Username,
        UserPoolId: "test",
      }),
    ).rejects.toEqual(new UsernameExistsError());
  });

  describe("PreSignUp lambda trigger", () => {
    describe("when PreSignUp trigger is enabled", () => {
      beforeEach(() => {
        mockTriggers.enabled.mockImplementation(
          (trigger) => trigger === "PreSignUp"
        );
      });

      it("calls the PreSignUp trigger with the user's username when the user pool has no username attributes", async () => {
        mockUserPoolService.getUserByUsername.mockResolvedValue(null);
        mockTriggers.preSignUp.mockResolvedValue({
          autoConfirmUser: false,
          autoVerifyPhone: false,
          autoVerifyEmail: false,
        });

        await adminCreateUser(TestContext, {
          TemporaryPassword: "pwd",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
          Username: "user-supplied",
          UserPoolId: "test",
          MessageAction: "SUPPRESS",
          ClientMetadata: {
            client: "metadata",
          },
        });

        expect(mockTriggers.preSignUp).toHaveBeenCalledWith(TestContext, {
          clientId: null,
          clientMetadata: {
            client: "metadata",
          },
          source: "PreSignUp_AdminCreateUser",
          userAttributes: [
            { Name: "email", Value: "example@example.com" },
            { Name: "sub", Value: expect.stringMatching(UUID) },
          ],
          userPoolId: "test",
          username: "user-supplied",
          validationData: undefined,
        });
      });

      it("calls the PreSignUp trigger with the user's sub when the user pool has email as a username attribute", async () => {
        mockUserPoolService.options.UsernameAttributes = ["email"];
        mockUserPoolService.getUserByUsername.mockResolvedValue(null);
        mockTriggers.preSignUp.mockResolvedValue({
          autoConfirmUser: false,
          autoVerifyPhone: false,
          autoVerifyEmail: false,
        });

        await adminCreateUser(TestContext, {
          TemporaryPassword: "pwd",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
          Username: "example@example.com",
          UserPoolId: "test",
          MessageAction: "SUPPRESS",
          ClientMetadata: {
            client: "metadata",
          },
        });

        expect(mockTriggers.preSignUp).toHaveBeenCalledWith(TestContext, {
          clientId: null,
          clientMetadata: {
            client: "metadata",
          },
          source: "PreSignUp_AdminCreateUser",
          userAttributes: [
            { Name: "email", Value: "example@example.com" },
            { Name: "sub", Value: expect.stringMatching(UUID) },
          ],
          userPoolId: "test",
          username: expect.stringMatching(UUID),
          validationData: undefined,
        });
      });

      it("throws if the PreSignUp trigger fails", async () => {
        mockUserPoolService.getUserByUsername.mockResolvedValue(null);
        mockTriggers.preSignUp.mockRejectedValue(new UserLambdaValidationError());

        await expect(
          adminCreateUser(TestContext, {
            TemporaryPassword: "pwd",
            UserAttributes: [{ Name: "email", Value: "example@example.com" }],
            Username: "user-supplied",
            UserPoolId: "test",
          })
        ).rejects.toEqual(new UserLambdaValidationError());
      });

      describe("autoConfirmUser response", () => {
        beforeEach(() => {
          mockUserPoolService.getUserByUsername.mockResolvedValue(null);
          mockTriggers.preSignUp.mockResolvedValue({
            autoConfirmUser: true,
            autoVerifyPhone: false,
            autoVerifyEmail: false,
          });
        });

        it("creates user with status CONFIRMED when autoConfirmUser is true", async () => {
          await adminCreateUser(TestContext, {
            TemporaryPassword: "pwd",
            UserAttributes: [{ Name: "email", Value: "example@example.com" }],
            Username: "user-supplied",
            UserPoolId: "test",
            MessageAction: "SUPPRESS",
          });

          expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
            TestContext,
            expect.objectContaining({
              UserStatus: "CONFIRMED",
            })
          );
        });

        describe("when PostConfirmation trigger is also enabled", () => {
          beforeEach(() => {
            mockTriggers.enabled.mockImplementation(
              (trigger) =>
                trigger === "PreSignUp" || trigger === "PostConfirmation"
            );
          });

          it("calls the PostConfirmation trigger after auto-confirming the user", async () => {
            await adminCreateUser(TestContext, {
              TemporaryPassword: "pwd",
              UserAttributes: [{ Name: "email", Value: "example@example.com" }],
              Username: "user-supplied",
              UserPoolId: "test",
              MessageAction: "SUPPRESS",
              ClientMetadata: {
                client: "metadata",
              },
            });

            expect(mockTriggers.postConfirmation).toHaveBeenCalledWith(
              TestContext,
              {
                clientId: null,
                clientMetadata: {
                  client: "metadata",
                },
                source: "PostConfirmation_ConfirmSignUp",
                username: "user-supplied",
                userPoolId: "test",
                userAttributes: expect.arrayContaining([
                  { Name: "email", Value: "example@example.com" },
                  { Name: "sub", Value: expect.stringMatching(UUID) },
                  { Name: "cognito:user_status", Value: "CONFIRMED" },
                ]),
              }
            );
          });
        });
      });

      describe("autoVerifyEmail response", () => {
        beforeEach(() => {
          mockUserPoolService.getUserByUsername.mockResolvedValue(null);
          mockTriggers.preSignUp.mockResolvedValue({
            autoConfirmUser: false,
            autoVerifyPhone: false,
            autoVerifyEmail: true,
          });
        });

        it("adds email_verified attribute when autoVerifyEmail is true and user has email", async () => {
          await adminCreateUser(TestContext, {
            TemporaryPassword: "pwd",
            UserAttributes: [{ Name: "email", Value: "example@example.com" }],
            Username: "user-supplied",
            UserPoolId: "test",
            MessageAction: "SUPPRESS",
          });

          expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
            TestContext,
            expect.objectContaining({
              Attributes: expect.arrayContaining([
                { Name: "email", Value: "example@example.com" },
                { Name: "email_verified", Value: "true" },
              ]),
            })
          );
        });

        it("adds email_verified attribute when autoVerifyEmail is true and user pool uses email as username", async () => {
          mockUserPoolService.options.UsernameAttributes = ["email"];

          await adminCreateUser(TestContext, {
            TemporaryPassword: "pwd",
            UserAttributes: [],
            Username: "example@example.com",
            UserPoolId: "test",
            MessageAction: "SUPPRESS",
          });

          expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
            TestContext,
            expect.objectContaining({
              Attributes: expect.arrayContaining([
                { Name: "email", Value: "example@example.com" },
                { Name: "email_verified", Value: "true" },
              ]),
            })
          );
        });

        it("does not add email_verified attribute when user has no email", async () => {
          await adminCreateUser(TestContext, {
            TemporaryPassword: "pwd",
            UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
            Username: "user-supplied",
            UserPoolId: "test",
          });

          expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
            TestContext,
            expect.objectContaining({
              Attributes: expect.not.arrayContaining([
                { Name: "email_verified", Value: "true" },
              ]),
            })
          );
        });
      });

      describe("autoVerifyPhone response", () => {
        beforeEach(() => {
          mockUserPoolService.getUserByUsername.mockResolvedValue(null);
          mockTriggers.preSignUp.mockResolvedValue({
            autoConfirmUser: false,
            autoVerifyPhone: true,
            autoVerifyEmail: false,
          });
        });

        it("adds phone_number_verified attribute when autoVerifyPhone is true and user has phone_number", async () => {
          await adminCreateUser(TestContext, {
            TemporaryPassword: "pwd",
            UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
            Username: "user-supplied",
            UserPoolId: "test",
          });

          expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
            TestContext,
            expect.objectContaining({
              Attributes: expect.arrayContaining([
                { Name: "phone_number", Value: "0400000000" },
                { Name: "phone_number_verified", Value: "true" },
              ]),
            })
          );
        });

        it("does not add phone_number_verified attribute when user has no phone_number", async () => {
          await adminCreateUser(TestContext, {
            TemporaryPassword: "pwd",
            UserAttributes: [{ Name: "email", Value: "example@example.com" }],
            Username: "user-supplied",
            UserPoolId: "test",
            MessageAction: "SUPPRESS",
          });

          expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
            TestContext,
            expect.objectContaining({
              Attributes: expect.not.arrayContaining([
                { Name: "phone_number_verified", Value: "true" },
              ]),
            })
          );
        });
      });
    });

    describe("when PreSignUp trigger is disabled", () => {
      it("does not call the PreSignUp trigger", async () => {
        mockUserPoolService.getUserByUsername.mockResolvedValue(null);

        await adminCreateUser(TestContext, {
          TemporaryPassword: "pwd",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
          Username: "user-supplied",
          UserPoolId: "test",
          MessageAction: "SUPPRESS",
        });

        expect(mockTriggers.preSignUp).not.toHaveBeenCalled();
      });

      it("creates user with default status FORCE_CHANGE_PASSWORD", async () => {
        mockUserPoolService.getUserByUsername.mockResolvedValue(null);

        await adminCreateUser(TestContext, {
          TemporaryPassword: "pwd",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
          Username: "user-supplied",
          UserPoolId: "test",
          MessageAction: "SUPPRESS",
        });

        expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
          TestContext,
          expect.objectContaining({
            UserStatus: "FORCE_CHANGE_PASSWORD",
          })
        );
      });

      it("does not call PostConfirmation even if enabled", async () => {
        mockUserPoolService.getUserByUsername.mockResolvedValue(null);
        mockTriggers.enabled.mockImplementation(
          (trigger) => trigger === "PostConfirmation"
        );

        await adminCreateUser(TestContext, {
          TemporaryPassword: "pwd",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
          Username: "user-supplied",
          UserPoolId: "test",
          MessageAction: "SUPPRESS",
        });

        expect(mockTriggers.postConfirmation).not.toHaveBeenCalled();
      });
    });
  });
});
