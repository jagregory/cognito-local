import { CognitoUserPoolEvent } from "aws-lambda";
import * as AWS from "aws-sdk";
import { InvocationResponse } from "aws-sdk/clients/lambda";
import { UnexpectedLambdaExceptionError } from "../errors";

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
        awsSdkVersion: "2.656.0", // TODO: this isn't correct
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

    console.log(
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
      console.log(ex);
      throw new UnexpectedLambdaExceptionError();
    }

    console.log(
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
