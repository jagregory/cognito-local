import { CognitoUserPoolEvent } from "aws-lambda";
import * as AWS from "aws-sdk";
import { InvocationResponse } from "aws-sdk/clients/lambda";
import * as fs from "fs";
import { UnexpectedLambdaExceptionError } from "../errors";
import log from "../log";

const awsSdkPackageJson = fs.readFileSync(
  require.resolve("aws-sdk/package.json"),
  "utf-8"
);
const awsSdkVersion = JSON.parse(awsSdkPackageJson).version;

interface UserMigrationEvent {
  userPoolId: string;
  clientId: string;
  username: string;
  password: string;
  userAttributes: Record<string, string>;
  triggerSource: "UserMigration_Authentication";
}

interface PostConfirmationEvent {
  userPoolId: string;
  clientId: string;
  username: string;
  userAttributes: Record<string, string>;
  triggerSource:
    | "PostConfirmation_ConfirmSignUp"
    | "PostConfirmation_ConfirmForgotPassword";
}

export type CognitoUserPoolResponse = CognitoUserPoolEvent["response"];

export interface Lambda {
  invoke(
    lambda: "UserMigration",
    event: UserMigrationEvent
  ): Promise<CognitoUserPoolResponse>;
  invoke(
    lambda: "PostConfirmation",
    event: PostConfirmationEvent
  ): Promise<CognitoUserPoolResponse>;
  enabled(lambda: "UserMigration"): boolean;
}

export interface FunctionConfig {
  UserMigration?: string;
  PostConfirmation?: string;
}

export type CreateLambda = (
  config: FunctionConfig,
  lambdaClient: AWS.Lambda
) => Lambda;

export const createLambda: CreateLambda = (config, lambdaClient) => ({
  enabled: (lambda) => !!config[lambda],
  async invoke(
    trigger: keyof FunctionConfig,
    event: UserMigrationEvent | PostConfirmationEvent
  ) {
    const functionName = config[trigger];
    if (!functionName) {
      throw new Error(`${trigger} trigger not configured`);
    }

    const lambdaEvent: CognitoUserPoolEvent = {
      version: 0, // TODO: how do we know what this is?
      userName: event.username,
      callerContext: {
        awsSdkVersion,
        clientId: event.clientId,
      },
      region: "local", // TODO: pull from above,
      userPoolId: event.userPoolId,
      triggerSource: event.triggerSource,
      request: {
        userAttributes: event.userAttributes,
      },
      response: {},
    };

    if (event.triggerSource === "UserMigration_Authentication") {
      lambdaEvent.request.password = event.password;
      lambdaEvent.request.validationData = {};
    }

    log.debug(
      `Invoking "${functionName}" with event`,
      JSON.stringify(lambdaEvent, undefined, 2)
    );
    let result: InvocationResponse;
    try {
      result = await lambdaClient
        .invoke({
          FunctionName: functionName,
          InvocationType: "RequestResponse",
          Payload: JSON.stringify(lambdaEvent),
        })
        .promise();
    } catch (ex) {
      log.error(ex);
      throw new UnexpectedLambdaExceptionError();
    }

    log.debug(
      `Lambda completed with StatusCode=${result.StatusCode} and FunctionError=${result.FunctionError}`
    );
    if (result.StatusCode === 200) {
      const parsedPayload = JSON.parse(result.Payload as string);

      return parsedPayload.response as CognitoUserPoolResponse;
    } else {
      console.error(result.FunctionError);
      throw new UnexpectedLambdaExceptionError();
    }
  },
});
