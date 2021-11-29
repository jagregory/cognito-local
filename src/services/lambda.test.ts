import { MockLogger } from "../__tests__/mockLogger";
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
        mockLambdaClient,
        MockLogger
      );

      expect(lambda.enabled("UserMigration")).toBe(true);
    });

    it("returns false if lambda is not configured", () => {
      const lambda = new LambdaService({}, mockLambdaClient, MockLogger);

      expect(lambda.enabled("UserMigration")).toBe(false);
    });
  });

  describe("invoke", () => {
    it("throws if lambda is not configured", async () => {
      const lambda = new LambdaService({}, mockLambdaClient, MockLogger);

      await expect(
        lambda.invoke("UserMigration", {
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

    describe("when lambda successful", () => {
      it("returns string payload as json", async () => {
        const response = Promise.resolve({
          StatusCode: 200,
          Payload: '{ "response": "value" }',
        });
        mockLambdaClient.invoke.mockReturnValue({
          promise: () => response,
        } as any);
        const lambda = new LambdaService(
          {
            UserMigration: "MyLambdaName",
          },
          mockLambdaClient,
          MockLogger
        );

        const result = await lambda.invoke("UserMigration", {
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
          mockLambdaClient,
          MockLogger
        );

        const result = await lambda.invoke("UserMigration", {
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
          mockLambdaClient,
          MockLogger
        );

        await lambda.invoke("UserMigration", {
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
            version: 0,
            callerContext: { awsSdkVersion: version, clientId: "clientId" },
            region: "local",
            userPoolId: "userPoolId",
            triggerSource: "UserMigration_Authentication",
            request: {
              clientMetadata: {
                client: "metadata",
              },
              userAttributes: {},
              password: "password",
              validationData: {
                validation: "data",
              },
            },
            response: {},
            userName: "username",
          }),
        });
      });
    });

    describe.each`
      trigger                 | source
      ${"PostAuthentication"} | ${"PostAuthentication_Authentication"}
      ${"PostConfirmation"}   | ${"PostConfirmation_ConfirmSignUp"}
      ${"PostConfirmation"}   | ${"PostConfirmation_ConfirmForgotPassword"}
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
          mockLambdaClient,
          MockLogger
        );

        await lambda.invoke(trigger, {
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
            version: 0,
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
          mockLambdaClient,
          MockLogger
        );

        await lambda.invoke("CustomMessage", {
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
            version: 0,
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
            response: {},
          }),
        });
      });
    });
  });
});
