import { TestContext } from "../__tests__/testContext";
import {
  InvalidLambdaResponseError,
  UserLambdaValidationError,
} from "../errors";
import { LambdaService } from "./lambda";
import * as AWS from "aws-sdk";
import { version } from "aws-sdk/package.json";

describe("Lambda function invoker", () => {
  let mockLambdaClient: jest.Mocked<AWS.Lambda>;

  beforeEach(() => {
    mockLambdaClient = {
      invoke: jest.fn(),
    } as any;
  });

  describe("enabled", () => {
    it("returns true if lambda is configured", () => {
      const lambda = new LambdaService(
        {
          UserMigration: "MyLambdaName",
        },
        mockLambdaClient
      );

      expect(lambda.enabled("UserMigration")).toBe(true);
    });

    it("returns false if lambda is not configured", () => {
      const lambda = new LambdaService({}, mockLambdaClient);

      expect(lambda.enabled("UserMigration")).toBe(false);
    });
  });

  describe("invoke", () => {
    it("throws if lambda is not configured", async () => {
      const lambda = new LambdaService({}, mockLambdaClient);

      await expect(
        lambda.invoke(TestContext, "UserMigration", {
          clientId: "clientId",
          clientMetadata: undefined,
          password: "password",
          triggerSource: "UserMigration_Authentication",
          userAttributes: {},
          username: "username",
          userPoolId: "userPoolId",
          validationData: undefined,
        })
      ).rejects.toEqual(new Error("UserMigration trigger not configured"));
    });

    describe("when lambda is successful", () => {
      it("returns string payload as json", async () => {
        const response = Promise.resolve({
          StatusCode: 200,
          Payload: '{ "response": { "ok": "value" } }',
        });
        mockLambdaClient.invoke.mockReturnValue({
          promise: () => response,
        } as any);
        const lambda = new LambdaService(
          {
            UserMigration: "MyLambdaName",
          },
          mockLambdaClient
        );

        const result = await lambda.invoke(TestContext, "UserMigration", {
          clientId: "clientId",
          clientMetadata: undefined,
          password: "password",
          triggerSource: "UserMigration_Authentication",
          userAttributes: {},
          username: "username",
          userPoolId: "userPoolId",
          validationData: undefined,
        });

        expect(result).toEqual({ ok: "value" });
      });

      it("throws if an invalid payload is returned", async () => {
        const response = Promise.resolve({
          StatusCode: 200,
          Payload: '{ "respo...',
        });
        mockLambdaClient.invoke.mockReturnValue({
          promise: () => response,
        } as any);
        const lambda = new LambdaService(
          {
            UserMigration: "MyLambdaName",
          },
          mockLambdaClient
        );

        await expect(
          lambda.invoke(TestContext, "UserMigration", {
            clientId: "clientId",
            clientMetadata: undefined,
            password: "password",
            triggerSource: "UserMigration_Authentication",
            userAttributes: {},
            username: "username",
            userPoolId: "userPoolId",
            validationData: undefined,
          })
        ).rejects.toBeInstanceOf(InvalidLambdaResponseError);
      });

      it("throws if the function returns an error", async () => {
        const response = Promise.resolve({
          StatusCode: 500,
          FunctionError: "Something bad happened",
        });
        mockLambdaClient.invoke.mockReturnValue({
          promise: () => response,
        } as any);
        const lambda = new LambdaService(
          {
            UserMigration: "MyLambdaName",
          },
          mockLambdaClient
        );

        await expect(
          lambda.invoke(TestContext, "UserMigration", {
            clientId: "clientId",
            clientMetadata: undefined,
            password: "password",
            triggerSource: "UserMigration_Authentication",
            userAttributes: {},
            username: "username",
            userPoolId: "userPoolId",
            validationData: undefined,
          })
        ).rejects.toEqual(
          new UserLambdaValidationError("Something bad happened")
        );
      });

      it("returns Buffer payload as json", async () => {
        const response = Promise.resolve({
          StatusCode: 200,
          Payload: Buffer.from('{ "response": "value" }'),
        });
        mockLambdaClient.invoke.mockReturnValue({
          promise: () => response,
        } as any);
        const lambda = new LambdaService(
          {
            UserMigration: "MyLambdaName",
          },
          mockLambdaClient
        );

        const result = await lambda.invoke(TestContext, "UserMigration", {
          clientId: "clientId",
          clientMetadata: undefined,
          password: "password",
          triggerSource: "UserMigration_Authentication",
          userAttributes: {},
          username: "username",
          userPoolId: "userPoolId",
          validationData: undefined,
        });

        expect(result).toEqual("value");
      });
    });

    describe.each([
      "PreSignUp_AdminCreateUser",
      "PreSignUp_ExternalProvider",
      "PreSignUp_SignUp",
    ] as const)("%s", (source) => {
      it("invokes the lambda", async () => {
        const response = Promise.resolve({
          StatusCode: 200,
          Payload: '{ "some": "json" }',
        });
        mockLambdaClient.invoke.mockReturnValue({
          promise: () => response,
        } as any);
        const lambda = new LambdaService(
          {
            PreSignUp: "MyLambdaName",
          },
          mockLambdaClient
        );

        await lambda.invoke(TestContext, "PreSignUp", {
          clientId: "clientId",
          clientMetadata: {
            client: "metadata",
          },
          triggerSource: source,
          username: "username",
          userPoolId: "userPoolId",
          userAttributes: {},
          validationData: {
            validation: "data",
          },
        });

        expect(mockLambdaClient.invoke).toHaveBeenCalledWith({
          FunctionName: "MyLambdaName",
          InvocationType: "RequestResponse",
          Payload: expect.jsonMatching({
            version: "0",
            callerContext: { awsSdkVersion: version, clientId: "clientId" },
            region: "local",
            userPoolId: "userPoolId",
            triggerSource: source,
            request: {
              clientMetadata: {
                client: "metadata",
              },
              userAttributes: {},
              validationData: {
                validation: "data",
              },
            },
            response: {
              autoConfirmUser: false,
              autoVerifyEmail: false,
              autoVerifyPhone: false,
            },
            userName: "username",
          }),
        });
      });
    });

    describe("UserMigration_Authentication", () => {
      it("invokes the lambda", async () => {
        const response = Promise.resolve({
          StatusCode: 200,
          Payload: '{ "some": "json" }',
        });
        mockLambdaClient.invoke.mockReturnValue({
          promise: () => response,
        } as any);
        const lambda = new LambdaService(
          {
            UserMigration: "MyLambdaName",
          },
          mockLambdaClient
        );

        await lambda.invoke(TestContext, "UserMigration", {
          clientId: "clientId",
          clientMetadata: {
            client: "metadata",
          },
          password: "password",
          triggerSource: "UserMigration_Authentication",
          username: "username",
          userPoolId: "userPoolId",
          userAttributes: {},
          validationData: {
            validation: "data",
          },
        });

        expect(mockLambdaClient.invoke).toHaveBeenCalledWith({
          FunctionName: "MyLambdaName",
          InvocationType: "RequestResponse",
          Payload: expect.jsonMatching({
            version: "0",
            callerContext: { awsSdkVersion: version, clientId: "clientId" },
            region: "local",
            userPoolId: "userPoolId",
            triggerSource: "UserMigration_Authentication",
            request: {
              clientMetadata: {
                client: "metadata",
              },
              password: "password",
              validationData: {
                validation: "data",
              },
            },
            response: {
              desiredDeliveryMediums: [],
              userAttributes: {},
            },
            userName: "username",
          }),
        });
      });
    });

    describe.each`
      trigger                 | source
      ${"PostAuthentication"} | ${"PostAuthentication_Authentication"}
    `("$source", ({ trigger, source }) => {
      it("invokes the lambda", async () => {
        const response = Promise.resolve({
          StatusCode: 200,
          Payload: '{ "some": "json" }',
        });
        mockLambdaClient.invoke.mockReturnValue({
          promise: () => response,
        } as any);
        const lambda = new LambdaService(
          {
            [trigger]: "MyLambdaName",
          },
          mockLambdaClient
        );

        await lambda.invoke(TestContext, trigger, {
          clientId: "clientId",
          triggerSource: source,
          username: "username",
          userPoolId: "userPoolId",
          userAttributes: {
            user: "attributes",
          },
          clientMetadata: {
            client: "metadata",
          },
        });

        expect(mockLambdaClient.invoke).toHaveBeenCalledWith({
          FunctionName: "MyLambdaName",
          InvocationType: "RequestResponse",
          Payload: expect.jsonMatching({
            version: "0",
            callerContext: { awsSdkVersion: version, clientId: "clientId" },
            region: "local",
            userPoolId: "userPoolId",
            triggerSource: source,
            request: {
              userAttributes: {
                user: "attributes",
              },
              clientMetadata: {
                client: "metadata",
              },
              newDeviceUsed: false,
            },
            response: {},
            userName: "username",
          }),
        });
      });
    });

    describe.each`
      trigger               | source
      ${"PostConfirmation"} | ${"PostConfirmation_ConfirmSignUp"}
      ${"PostConfirmation"} | ${"PostConfirmation_ConfirmForgotPassword"}
    `("$source", ({ trigger, source }) => {
      it("invokes the lambda", async () => {
        const response = Promise.resolve({
          StatusCode: 200,
          Payload: '{ "some": "json" }',
        });
        mockLambdaClient.invoke.mockReturnValue({
          promise: () => response,
        } as any);
        const lambda = new LambdaService(
          {
            [trigger]: "MyLambdaName",
          },
          mockLambdaClient
        );

        await lambda.invoke(TestContext, trigger, {
          clientId: "clientId",
          triggerSource: source,
          username: "username",
          userPoolId: "userPoolId",
          userAttributes: {
            user: "attributes",
          },
          clientMetadata: {
            client: "metadata",
          },
        });

        expect(mockLambdaClient.invoke).toHaveBeenCalledWith({
          FunctionName: "MyLambdaName",
          InvocationType: "RequestResponse",
          Payload: expect.jsonMatching({
            version: "0",
            callerContext: { awsSdkVersion: version, clientId: "clientId" },
            region: "local",
            userPoolId: "userPoolId",
            triggerSource: source,
            request: {
              userAttributes: {
                user: "attributes",
              },
              clientMetadata: {
                client: "metadata",
              },
            },
            response: {},
            userName: "username",
          }),
        });
      });
    });

    describe.each`
      trigger              | source
      ${"TokenGeneration"} | ${"TokenGeneration_AuthenticateDevice"}
      ${"TokenGeneration"} | ${"TokenGeneration_Authentication"}
      ${"TokenGeneration"} | ${"TokenGeneration_HostedAuth"}
      ${"TokenGeneration"} | ${"TokenGeneration_NewPasswordChallenge"}
      ${"TokenGeneration"} | ${"TokenGeneration_RefreshTokens"}
    `("$source", ({ trigger, source }) => {
      it("invokes the lambda", async () => {
        const response = Promise.resolve({
          StatusCode: 200,
          Payload: '{ "some": "json" }',
        });
        mockLambdaClient.invoke.mockReturnValue({
          promise: () => response,
        } as any);
        const lambda = new LambdaService(
          {
            [trigger]: "MyLambdaName",
          },
          mockLambdaClient
        );

        await lambda.invoke(TestContext, trigger, {
          clientId: "clientId",
          triggerSource: source,
          username: "username",
          userPoolId: "userPoolId",
          userAttributes: {
            user: "attributes",
          },
          clientMetadata: {
            client: "metadata",
          },
          groupConfiguration: {
            groupsToOverride: ["group1", "group2"],
            iamRolesToOverride: ["role1", "role2"],
            preferredRole: "preferredRole",
          },
        });

        expect(mockLambdaClient.invoke).toHaveBeenCalledWith({
          FunctionName: "MyLambdaName",
          InvocationType: "RequestResponse",
          Payload: expect.jsonMatching({
            version: "0",
            callerContext: { awsSdkVersion: version, clientId: "clientId" },
            region: "local",
            userPoolId: "userPoolId",
            triggerSource: source,
            request: {
              userAttributes: {
                user: "attributes",
              },
              clientMetadata: {
                client: "metadata",
              },
              groupConfiguration: {
                groupsToOverride: ["group1", "group2"],
                iamRolesToOverride: ["role1", "role2"],
                preferredRole: "preferredRole",
              },
            },
            response: {
              claimsOverrideDetails: {
                claimsToAddOrOverride: {},
                claimsToSuppress: [],
                groupOverrideDetails: {
                  groupsToOverride: [],
                  iamRolesToOverride: [],
                },
              },
            },
            userName: "username",
          }),
        });
      });
    });

    describe.each([
      "CustomMessage_SignUp",
      "CustomMessage_AdminCreateUser",
      "CustomMessage_ResendCode",
      "CustomMessage_ForgotPassword",
      "CustomMessage_UpdateUserAttribute",
      "CustomMessage_VerifyUserAttribute",
      "CustomMessage_Authentication",
    ] as const)("%s", (source) => {
      it("invokes the lambda function with the code parameter", async () => {
        const response = Promise.resolve({
          StatusCode: 200,
          Payload: '{ "some": "json" }',
        });
        mockLambdaClient.invoke.mockReturnValue({
          promise: () => response,
        } as any);
        const lambda = new LambdaService(
          {
            CustomMessage: "MyLambdaName",
          },
          mockLambdaClient
        );

        await lambda.invoke(TestContext, "CustomMessage", {
          clientId: "clientId",
          clientMetadata: {
            client: "metadata",
          },
          codeParameter: "{####}",
          triggerSource: source,
          userAttributes: {},
          username: "username",
          usernameParameter: "{username}",
          userPoolId: "userPoolId",
        });

        expect(mockLambdaClient.invoke).toHaveBeenCalledWith({
          FunctionName: "MyLambdaName",
          InvocationType: "RequestResponse",
          Payload: expect.jsonMatching({
            version: "0",
            callerContext: { awsSdkVersion: version, clientId: "clientId" },
            region: "local",
            userPoolId: "userPoolId",
            triggerSource: source,
            userName: "username",
            request: {
              userAttributes: {},
              usernameParameter: "{username}",
              codeParameter: "{####}",
              clientMetadata: {
                client: "metadata",
              },
            },
            response: {
              smsMessage: "",
              emailMessage: "",
              emailSubject: "",
            },
          }),
        });
      });
    });

    describe.each([
      "CustomEmailSender_SignUp",
      "CustomEmailSender_ResendCode",
      "CustomEmailSender_ForgotPassword",
      "CustomEmailSender_UpdateUserAttribute",
      "CustomEmailSender_VerifyUserAttribute",
      "CustomEmailSender_AdminCreateUser",
    ] as const)("%s", (source) => {
      it("invokes the lambda function with the code parameter", async () => {
        const response = Promise.resolve({
          StatusCode: 200,
          Payload: '{ "some": "json" }',
        });

        mockLambdaClient.invoke.mockReturnValue({
          promise: () => response,
        } as any);

        const lambda = new LambdaService(
          {
            CustomEmailSender: "MyLambdaName",
          },
          mockLambdaClient
        );

        await lambda.invoke(TestContext, "CustomEmailSender", {
          code: "code",
          clientId: "clientId",
          clientMetadata: {
            client: "metadata",
          },
          triggerSource: source,
          userAttributes: {},
          username: "username",
          userPoolId: "userPoolId",
        });

        expect(mockLambdaClient.invoke).toHaveBeenCalledWith({
          FunctionName: "MyLambdaName",
          InvocationType: "RequestResponse",
          Payload: expect.jsonMatching({
            version: "0",
            callerContext: { awsSdkVersion: version, clientId: "clientId" },
            region: "local",
            userPoolId: "userPoolId",
            triggerSource: source,
            userName: "username",
            request: {
              type: "customEmailSenderRequestV1",
              code: "code",
              userAttributes: {},
              clientMetadata: { client: "metadata" },
            },
            response: {},
          }),
        });
      });
    });
  });
});
