import { createLambda } from "./lambda";
import * as AWS from "aws-sdk";

describe("Lambda function invoker", () => {
  let mockLambdaClient: jest.Mocked<AWS.Lambda>;

  beforeEach(() => {
    mockLambdaClient = {
      invoke: jest.fn(),
    } as any;
  });

  describe("enabled", () => {
    it("returns true if lambda is configured", () => {
      const lambda = createLambda(
        {
          UserMigration: "MyLambdaName",
        },
        mockLambdaClient
      );

      expect(lambda.enabled("UserMigration")).toBe(true);
    });

    it("returns false if lambda is not configured", () => {
      const lambda = createLambda({}, mockLambdaClient);

      expect(lambda.enabled("UserMigration")).toBe(false);
    });
  });

  describe("invoke", () => {
    it("throws if lambda is not configured", async () => {
      const lambda = createLambda({}, mockLambdaClient);

      await expect(
        lambda.invoke("UserMigration", {
          clientId: "clientId",
          password: "password",
          triggerSource: "UserMigration_Authentication",
          username: "username",
          userPoolId: "userPoolId",
          userAttributes: {},
        })
      ).rejects.toEqual(new Error("UserMigration trigger not configured"));
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
        const lambda = createLambda(
          {
            UserMigration: "MyLambdaName",
          },
          mockLambdaClient
        );

        await lambda.invoke("UserMigration", {
          clientId: "clientId",
          password: "password",
          triggerSource: "UserMigration_Authentication",
          username: "username",
          userPoolId: "userPoolId",
          userAttributes: {},
        });

        expect(mockLambdaClient.invoke).toHaveBeenCalledWith({
          FunctionName: "MyLambdaName",
          InvocationType: "RequestResponse",
          Payload: JSON.stringify({
            version: 0,
            userName: "username",
            callerContext: { awsSdkVersion: "2.656.0", clientId: "clientId" },
            region: "local",
            userPoolId: "userPoolId",
            triggerSource: "UserMigration_Authentication",
            request: {
              userAttributes: {},
              password: "password",
              validationData: {},
            },
            response: {},
          }),
        });
      });
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
        const lambda = createLambda(
          {
            UserMigration: "MyLambdaName",
          },
          mockLambdaClient
        );

        const result = await lambda.invoke("UserMigration", {
          clientId: "clientId",
          password: "password",
          triggerSource: "UserMigration_Authentication",
          username: "username",
          userPoolId: "userPoolId",
          userAttributes: {},
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
        const lambda = createLambda(
          {
            UserMigration: "MyLambdaName",
          },
          mockLambdaClient
        );

        const result = await lambda.invoke("UserMigration", {
          clientId: "clientId",
          password: "password",
          triggerSource: "UserMigration_Authentication",
          username: "username",
          userPoolId: "userPoolId",
          userAttributes: {},
        });

        expect(result).toEqual("value");
      });
    });
  });
});
