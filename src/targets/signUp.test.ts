import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockMessages } from "../__tests__/mockMessages";
import { newMockTriggers } from "../__tests__/mockTriggers";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { UUID } from "../__tests__/patterns";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import {
  InvalidParameterError,
  UserLambdaValidationError,
  UsernameExistsError,
} from "../errors";
import { Messages, Triggers, UserPoolService } from "../services";
import { SignUp, SignUpTarget } from "./signUp";
import { Config, DefaultConfig } from "../server/config";

describe("SignUp target", () => {
  let signUp: SignUpTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let mockMessages: jest.Mocked<Messages>;
  let mockOtp: jest.MockedFunction<() => string>;
  let mockTriggers: jest.Mocked<Triggers>;
  let now: Date;
  let config: Config;

  beforeEach(() => {
    now = new Date(2020, 1, 2, 3, 4, 5);

    mockUserPoolService = newMockUserPoolService();
    mockMessages = newMockMessages();
    mockOtp = jest.fn();
    mockTriggers = newMockTriggers();
    config = DefaultConfig;
    signUp = SignUp({
      cognito: newMockCognitoService(mockUserPoolService),
      clock: new ClockFake(now),
      messages: mockMessages,
      otp: mockOtp,
      config,
      triggers: mockTriggers,
    });
  });

  it("throws if user already exists", async () => {
    const user = TDB.user();

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await expect(
      signUp(TestContext, {
        ClientId: "clientId",
        Password: "pwd",
        Username: user.Username,
        UserAttributes: [],
      })
    ).rejects.toBeInstanceOf(UsernameExistsError);
  });

  it("saves a new user with email", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await signUp(TestContext, {
      ClientId: "clientId",
      Password: "pwd",
      Username: "user-supplied",
      UserAttributes: [{ Name: "email", Value: "example@example.com" }],
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      Attributes: [
        {
          Name: "sub",
          Value: expect.stringMatching(UUID),
        },
        { Name: "email", Value: "example@example.com" },
        { Name: "email_verified", Value: "false" },
      ],
      Enabled: true,
      Password: "pwd",
      UserCreateDate: now,
      UserLastModifiedDate: now,
      UserStatus: "UNCONFIRMED",
      Username: "user-supplied",
      RefreshTokens: [],
    });
  });

  it("saves a new user with email and phone_number", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await signUp(TestContext, {
      ClientId: "clientId",
      Password: "pwd",
      Username: "user-supplied",
      UserAttributes: [
        { Name: "email", Value: "example@example.com" },
        { Name: "phone_number", Value: "0400000000" },
      ],
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      Attributes: [
        {
          Name: "sub",
          Value: expect.stringMatching(UUID),
        },
        { Name: "email", Value: "example@example.com" },
        { Name: "phone_number", Value: "0400000000" },
        { Name: "email_verified", Value: "false" },
        { Name: "phone_number_verified", Value: "false" },
      ],
      Enabled: true,
      Password: "pwd",
      UserCreateDate: now,
      UserLastModifiedDate: now,
      UserStatus: "UNCONFIRMED",
      Username: "user-supplied",
      RefreshTokens: [],
    });
  });

  describe("when PreSignUp trigger is enabled", () => {
    beforeEach(() => {
      mockTriggers.enabled.mockImplementation(
        (trigger) => trigger === "PreSignUp"
      );
    });

    it("calls the trigger lambda", async () => {
      mockUserPoolService.getUserByUsername.mockResolvedValue(null);
      mockTriggers.preSignUp.mockResolvedValue({
        autoConfirmUser: false,
        autoVerifyPhone: false,
        autoVerifyEmail: false,
      });

      await signUp(TestContext, {
        ClientId: "clientId",
        ClientMetadata: {
          client: "metadata",
        },
        Password: "pwd",
        Username: "user-supplied",
        UserAttributes: [{ Name: "email", Value: "example@example.com" }],
        ValidationData: [{ Name: "another", Value: "attribute" }],
      });

      expect(mockTriggers.preSignUp).toHaveBeenCalledWith(TestContext, {
        clientId: "clientId",
        clientMetadata: {
          client: "metadata",
        },
        source: "PreSignUp_SignUp",
        userAttributes: [
          { Name: "sub", Value: expect.stringMatching(UUID) },
          { Name: "email", Value: "example@example.com" },
          { Name: "email_verified", Value: "false" },
        ],
        userPoolId: "test",
        username: "user-supplied",
        validationData: undefined,
      });
    });

    it("throws if the trigger lambda fails", async () => {
      mockUserPoolService.getUserByUsername.mockResolvedValue(null);
      mockTriggers.preSignUp.mockRejectedValue(new UserLambdaValidationError());

      await expect(
        signUp(TestContext, {
          ClientId: "clientId",
          ClientMetadata: {
            client: "metadata",
          },
          Password: "pwd",
          Username: "user-supplied",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
          ValidationData: [{ Name: "another", Value: "attribute" }],
        })
      ).rejects.toBeInstanceOf(UserLambdaValidationError);
    });

    describe("autoConfirmUser=true", () => {
      beforeEach(() => {
        mockUserPoolService.getUserByUsername.mockResolvedValue(null);
        mockTriggers.preSignUp.mockResolvedValue({
          autoConfirmUser: true,
          autoVerifyPhone: false,
          autoVerifyEmail: false,
        });
      });

      it("confirms the user", async () => {
        await signUp(TestContext, {
          ClientId: "clientId",
          ClientMetadata: {
            client: "metadata",
          },
          Password: "pwd",
          Username: "user-supplied",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
          ValidationData: [{ Name: "another", Value: "attribute" }],
        });

        expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
          TestContext,
          expect.objectContaining({
            UserStatus: "CONFIRMED",
          })
        );
      });

      describe("when PostConfirmation trigger is enabled", () => {
        beforeEach(() => {
          mockTriggers.enabled.mockImplementation(
            (trigger) =>
              trigger === "PreSignUp" || trigger === "PostConfirmation"
          );
        });

        it("calls the PostConfirmation trigger lambda", async () => {
          await signUp(TestContext, {
            ClientId: "clientId",
            ClientMetadata: {
              client: "metadata",
            },
            Password: "pwd",
            Username: "user-supplied",
            UserAttributes: [{ Name: "email", Value: "example@example.com" }],
            ValidationData: [{ Name: "another", Value: "attribute" }],
          });

          expect(mockTriggers.postConfirmation).toHaveBeenCalledWith(
            TestContext,
            {
              clientId: "clientId",
              clientMetadata: {
                client: "metadata",
              },
              source: "PostConfirmation_ConfirmSignUp",
              userAttributes: [
                { Name: "sub", Value: expect.stringMatching(UUID) },
                { Name: "email", Value: "example@example.com" },
                { Name: "email_verified", Value: "false" },
                { Name: "cognito:user_status", Value: "CONFIRMED" },
              ],
              userPoolId: "test",
              username: "user-supplied",
              validationData: undefined,
            }
          );
        });

        it("throws if the PostConfirmation lambda fails", async () => {
          mockUserPoolService.getUserByUsername.mockResolvedValue(null);
          mockTriggers.postConfirmation.mockRejectedValue(
            new UserLambdaValidationError()
          );

          await expect(
            signUp(TestContext, {
              ClientId: "clientId",
              ClientMetadata: {
                client: "metadata",
              },
              Password: "pwd",
              Username: "user-supplied",
              UserAttributes: [
                { Name: "email", Value: "example@example.com" },
                { Name: "email_verified", Value: "false" },
              ],
              ValidationData: [{ Name: "another", Value: "attribute" }],
            })
          ).rejects.toBeInstanceOf(UserLambdaValidationError);
        });
      });
    });

    describe("autoConfirmUser=false", () => {
      beforeEach(() => {
        mockUserPoolService.getUserByUsername.mockResolvedValue(null);
        mockTriggers.preSignUp.mockResolvedValue({
          autoConfirmUser: false,
          autoVerifyPhone: false,
          autoVerifyEmail: false,
        });
      });

      it("does not confirm the user", async () => {
        await signUp(TestContext, {
          ClientId: "clientId",
          ClientMetadata: {
            client: "metadata",
          },
          Password: "pwd",
          Username: "user-supplied",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
          ValidationData: [{ Name: "another", Value: "attribute" }],
        });

        expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
          TestContext,
          expect.objectContaining({
            UserStatus: "UNCONFIRMED",
          })
        );
      });

      it("does not call the PostConfirmation trigger lambda", async () => {
        mockUserPoolService.getUserByUsername.mockResolvedValue(null);

        await signUp(TestContext, {
          ClientId: "clientId",
          Password: "pwd",
          Username: "user-supplied",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
        });

        expect(mockTriggers.postConfirmation).not.toHaveBeenCalled();
      });
    });

    it("verifies the user's email if the lambda returns autoVerifyEmail=true and the user has an email attribute", async () => {
      mockUserPoolService.getUserByUsername.mockResolvedValue(null);
      mockTriggers.preSignUp.mockResolvedValue({
        autoConfirmUser: false,
        autoVerifyEmail: true,
        autoVerifyPhone: false,
      });

      await signUp(TestContext, {
        ClientId: "clientId",
        ClientMetadata: {
          client: "metadata",
        },
        Password: "pwd",
        Username: "user-supplied",
        UserAttributes: [{ Name: "email", Value: "example@example.com" }],
        ValidationData: [{ Name: "another", Value: "attribute" }],
      });

      expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
        TestContext,
        expect.objectContaining({
          Attributes: [
            { Name: "sub", Value: expect.stringMatching(UUID) },
            { Name: "email", Value: "example@example.com" },
            { Name: "email_verified", Value: "true" },
          ],
        })
      );
    });

    it("does not verify the user's email if the lambda returns autoVerifyEmail=true but the user does not have an email attribute", async () => {
      config.UserPoolDefaults.UsernameAttributes = [];

      mockUserPoolService.getUserByUsername.mockResolvedValue(null);
      mockTriggers.preSignUp.mockResolvedValue({
        autoConfirmUser: false,
        autoVerifyPhone: false,
        autoVerifyEmail: true,
      });

      await signUp(TestContext, {
        ClientId: "clientId",
        ClientMetadata: {
          client: "metadata",
        },
        Password: "pwd",
        Username: "user-supplied",
        UserAttributes: [],
        ValidationData: [{ Name: "another", Value: "attribute" }],
      });

      expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
        TestContext,
        expect.objectContaining({
          Attributes: [{ Name: "sub", Value: expect.stringMatching(UUID) }],
        })
      );
    });

    it("verifies the user's phone_number if the lambda returns autoVerifyPhone=true and the user has an phone_number attribute", async () => {
      config.UserPoolDefaults.UsernameAttributes = [];

      mockUserPoolService.getUserByUsername.mockResolvedValue(null);
      mockTriggers.preSignUp.mockResolvedValue({
        autoConfirmUser: false,
        autoVerifyPhone: true,
        autoVerifyEmail: false,
      });

      await signUp(TestContext, {
        ClientId: "clientId",
        ClientMetadata: {
          client: "metadata",
        },
        Password: "pwd",
        Username: "user-supplied",
        UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
        ValidationData: [{ Name: "another", Value: "attribute" }],
      });

      expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
        TestContext,
        expect.objectContaining({
          Attributes: [
            { Name: "sub", Value: expect.stringMatching(UUID) },
            { Name: "phone_number", Value: "0400000000" },
            { Name: "phone_number_verified", Value: "true" },
          ],
        })
      );
    });

    it("does not verify the user's phone_number if the lambda returns autoVerifyPhone=true but the user does not have a phone_number attribute", async () => {
      config.UserPoolDefaults.UsernameAttributes = [];

      mockUserPoolService.getUserByUsername.mockResolvedValue(null);
      mockTriggers.preSignUp.mockResolvedValue({
        autoConfirmUser: false,
        autoVerifyPhone: true,
        autoVerifyEmail: false,
      });

      await signUp(TestContext, {
        ClientId: "clientId",
        ClientMetadata: {
          client: "metadata",
        },
        Password: "pwd",
        Username: "user-supplied",
        UserAttributes: [],
        ValidationData: [{ Name: "another", Value: "attribute" }],
      });

      expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
        TestContext,
        expect.objectContaining({
          Attributes: [{ Name: "sub", Value: expect.stringMatching(UUID) }],
        })
      );
    });
  });

  describe("when PreSignUp trigger is disabled", () => {
    it("does not call the trigger lambda", async () => {
      mockUserPoolService.getUserByUsername.mockResolvedValue(null);

      await signUp(TestContext, {
        ClientId: "clientId",
        Password: "pwd",
        Username: "user-supplied",
        UserAttributes: [{ Name: "email", Value: "example@example.com" }],
      });

      expect(mockTriggers.preSignUp).not.toHaveBeenCalled();
    });
  });

  describe("messages", () => {
    describe("UserPool.AutoVerifiedAttributes=default", () => {
      beforeEach(() => {
        mockUserPoolService.options.AutoVerifiedAttributes = undefined;
      });

      it("does not send a confirmation code", async () => {
        mockUserPoolService.getUserByUsername.mockResolvedValue(null);
        mockOtp.mockReturnValue("123456");

        await signUp(TestContext, {
          ClientId: "clientId",
          ClientMetadata: {
            client: "metadata",
          },
          Password: "pwd",
          Username: "user-supplied",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
        });

        expect(mockMessages.deliver).not.toHaveBeenCalled();
      });
    });

    describe("UserPool.AutoVerifiedAttributes=email", () => {
      beforeEach(() => {
        mockUserPoolService.options.AutoVerifiedAttributes = ["email"];
      });

      it("sends a confirmation code to the user's email address", async () => {
        mockUserPoolService.getUserByUsername.mockResolvedValue(null);
        mockOtp.mockReturnValue("123456");

        await signUp(TestContext, {
          ClientId: "clientId",
          ClientMetadata: {
            client: "metadata",
          },
          Password: "pwd",
          Username: "user-supplied",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
        });

        const createdUser = {
          Attributes: [
            { Name: "sub", Value: expect.stringMatching(UUID) },
            { Name: "email", Value: "example@example.com" },
            { Name: "email_verified", Value: "false" },
          ],
          Enabled: true,
          Password: "pwd",
          UserCreateDate: now,
          UserLastModifiedDate: now,
          UserStatus: "UNCONFIRMED",
          Username: "user-supplied",
          RefreshTokens: [],
        };

        expect(mockMessages.deliver).toHaveBeenCalledWith(
          TestContext,
          "SignUp",
          "clientId",
          "test",
          createdUser,
          "123456",
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

      it("fails if user doesn't have an email", async () => {
        await expect(
          signUp(TestContext, {
            ClientId: "clientId",
            Password: "pwd",
            Username: "user-supplied",
            UserAttributes: [],
          })
        ).rejects.toEqual(
          new InvalidParameterError(
            "User has no attribute matching desired auto verified attributes"
          )
        );

        expect(mockMessages.deliver).not.toHaveBeenCalled();
      });
    });

    describe("UserPool.AutoVerifiedAttributes=phone_number", () => {
      beforeEach(() => {
        mockUserPoolService.options.AutoVerifiedAttributes = ["phone_number"];
      });

      it("sends a confirmation code to the user's phone number", async () => {
        mockUserPoolService.getUserByUsername.mockResolvedValue(null);
        mockOtp.mockReturnValue("123456");

        await signUp(TestContext, {
          ClientId: "clientId",
          ClientMetadata: {
            client: "metadata",
          },
          Password: "pwd",
          Username: "user-supplied",
          UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
        });

        const createdUser = {
          Attributes: [
            { Name: "sub", Value: expect.stringMatching(UUID) },
            { Name: "phone_number", Value: "0400000000" },
            { Name: "phone_number_verified", Value: "false" },
          ],
          Enabled: true,
          Password: "pwd",
          UserCreateDate: now,
          UserLastModifiedDate: now,
          UserStatus: "UNCONFIRMED",
          Username: "user-supplied",
          RefreshTokens: [],
        };

        expect(mockMessages.deliver).toHaveBeenCalledWith(
          TestContext,
          "SignUp",
          "clientId",
          "test",
          createdUser,
          "123456",
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

      it("fails if user doesn't have a phone_number", async () => {
        await expect(
          signUp(TestContext, {
            ClientId: "clientId",
            Password: "pwd",
            Username: "user-supplied",
            UserAttributes: [],
          })
        ).rejects.toEqual(
          new InvalidParameterError(
            "User has no attribute matching desired auto verified attributes"
          )
        );

        expect(mockMessages.deliver).not.toHaveBeenCalled();
      });
    });

    describe("UserPool.AutoVerifiedAttributes=phone_number and email", () => {
      beforeEach(() => {
        mockUserPoolService.options.AutoVerifiedAttributes = [
          "email",
          "phone_number",
        ];
      });

      it("sends a confirmation code to the user's phone number if they have both attributes", async () => {
        mockUserPoolService.getUserByUsername.mockResolvedValue(null);
        mockOtp.mockReturnValue("123456");

        await signUp(TestContext, {
          ClientId: "clientId",
          ClientMetadata: {
            client: "metadata",
          },
          Password: "pwd",
          Username: "user-supplied",
          UserAttributes: [
            { Name: "email", Value: "example@example.com" },
            { Name: "phone_number", Value: "0400000000" },
          ],
        });

        const createdUser = {
          Attributes: [
            { Name: "sub", Value: expect.stringMatching(UUID) },
            { Name: "email", Value: "example@example.com" },
            { Name: "phone_number", Value: "0400000000" },
            { Name: "email_verified", Value: "false" },
            { Name: "phone_number_verified", Value: "false" },
          ],
          Enabled: true,
          Password: "pwd",
          UserCreateDate: now,
          UserLastModifiedDate: now,
          UserStatus: "UNCONFIRMED",
          Username: "user-supplied",
          RefreshTokens: [],
        };

        expect(mockMessages.deliver).toHaveBeenCalledWith(
          TestContext,
          "SignUp",
          "clientId",
          "test",
          createdUser,
          "123456",
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

      it("sends a confirmation code to the user's email if they only have an email", async () => {
        mockUserPoolService.getUserByUsername.mockResolvedValue(null);
        mockOtp.mockReturnValue("123456");

        await signUp(TestContext, {
          ClientId: "clientId",
          ClientMetadata: {
            client: "metadata",
          },
          Password: "pwd",
          Username: "user-supplied",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
        });

        const createdUser = {
          Attributes: [
            { Name: "sub", Value: expect.stringMatching(UUID) },
            { Name: "email", Value: "example@example.com" },
            { Name: "email_verified", Value: "false" },
          ],
          Enabled: true,
          Password: "pwd",
          UserCreateDate: now,
          UserLastModifiedDate: now,
          UserStatus: "UNCONFIRMED",
          Username: "user-supplied",
          RefreshTokens: [],
        };

        expect(mockMessages.deliver).toHaveBeenCalledWith(
          TestContext,
          "SignUp",
          "clientId",
          "test",
          createdUser,
          "123456",
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

      it("fails if user doesn't have a phone_number or an email", async () => {
        await expect(
          signUp(TestContext, {
            ClientId: "clientId",
            Password: "pwd",
            Username: "user-supplied",
            UserAttributes: [],
          })
        ).rejects.toEqual(
          new InvalidParameterError(
            "User has no attribute matching desired auto verified attributes"
          )
        );

        expect(mockMessages.deliver).not.toHaveBeenCalled();
      });
    });
  });

  it("saves the confirmation code on the user for comparison when confirming", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);
    mockOtp.mockReturnValue("123456");

    await signUp(TestContext, {
      ClientId: "clientId",
      Password: "pwd",
      Username: "user-supplied",
      UserAttributes: [{ Name: "email", Value: "example@example.com" }],
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      Attributes: [
        { Name: "sub", Value: expect.stringMatching(UUID) },
        { Name: "email", Value: "example@example.com" },
        { Name: "email_verified", Value: "false" },
      ],
      ConfirmationCode: "123456",
      Enabled: true,
      Password: "pwd",
      UserCreateDate: now,
      UserLastModifiedDate: now,
      UserStatus: "UNCONFIRMED",
      Username: "user-supplied",
      RefreshTokens: [],
    });
  });
});
