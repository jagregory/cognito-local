import { CognitoUserPoolEvent } from "aws-lambda";
import type { Lambda as LambdaClient } from "aws-sdk";
import { InvocationResponse } from "aws-sdk/clients/lambda";
import { UnexpectedLambdaExceptionError } from "../errors";
import { version as awsSdkVersion } from "aws-sdk/package.json";
import { Logger } from "../log";

interface CustomMessageEvent {
  userPoolId: string;
  clientId: string;
  codeParameter: string;
  usernameParameter: string;
  userAttributes: Record<string, string>;
  triggerSource:
    | "CustomMessage_SignUp"
    | "CustomMessage_AdminCreateUser"
    | "CustomMessage_ResendCode"
    | "CustomMessage_ForgotPassword"
    | "CustomMessage_UpdateUserAttribute"
    | "CustomMessage_VerifyUserAttribute"
    | "CustomMessage_Authentication";
}

interface UserMigrationEvent {
  userPoolId: string;
  clientId: string;
  username: string;
  password: string;
  userAttributes: Record<string, string>;
  triggerSource: "UserMigration_Authentication";
}

interface PostAuthenticationEvent {
  userPoolId: string;
  clientId: string;
  username: string;
  userAttributes: Record<string, string>;
  triggerSource: "PostAuthentication_Authentication";
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

export interface FunctionConfig {
  CustomMessage?: string;
  UserMigration?: string;
  PostAuthentication?: string;
  PostConfirmation?: string;
}

export interface Lambda {
  enabled(lambda: keyof FunctionConfig): boolean;
  invoke(
    lambda: "CustomMessage",
    event: CustomMessageEvent
  ): Promise<CognitoUserPoolResponse>;
  invoke(
    lambda: "UserMigration",
    event: UserMigrationEvent
  ): Promise<CognitoUserPoolResponse>;
  invoke(
    lambda: "PostAuthentication",
    event: PostAuthenticationEvent
  ): Promise<CognitoUserPoolResponse>;
  invoke(
    lambda: "PostConfirmation",
    event: PostConfirmationEvent
  ): Promise<CognitoUserPoolResponse>;
}

export class LambdaService implements Lambda {
  private readonly config: FunctionConfig;
  private readonly lambdaClient: LambdaClient;
  private readonly logger: Logger;

  public constructor(
    config: FunctionConfig,
    lambdaClient: LambdaClient,
    logger: Logger
  ) {
    this.config = config;
    this.lambdaClient = lambdaClient;
    this.logger = logger;
  }

  public enabled(lambda: keyof FunctionConfig): boolean {
    return !!this.config[lambda];
  }

  public async invoke(
    trigger: keyof FunctionConfig,
    event:
      | CustomMessageEvent
      | UserMigrationEvent
      | PostAuthenticationEvent
      | PostConfirmationEvent
  ) {
    const functionName = this.config[trigger];
    if (!functionName) {
      throw new Error(`${trigger} trigger not configured`);
    }

    const lambdaEvent: CognitoUserPoolEvent = {
      version: 0, // TODO: how do we know what this is?
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
    } else if (
      event.triggerSource === "CustomMessage_SignUp" ||
      event.triggerSource === "CustomMessage_AdminCreateUser" ||
      event.triggerSource === "CustomMessage_ResendCode" ||
      event.triggerSource === "CustomMessage_ForgotPassword" ||
      event.triggerSource === "CustomMessage_UpdateUserAttribute" ||
      event.triggerSource === "CustomMessage_VerifyUserAttribute" ||
      event.triggerSource === "CustomMessage_Authentication"
    ) {
      lambdaEvent.request.usernameParameter = event.usernameParameter;
      lambdaEvent.request.codeParameter = event.codeParameter;
    }

    if ("username" in event) {
      lambdaEvent.userName = event.username;
    }

    this.logger.debug(
      `Invoking "${functionName}" with event`,
      JSON.stringify(lambdaEvent, undefined, 2)
    );
    let result: InvocationResponse;
    try {
      result = await this.lambdaClient
        .invoke({
          FunctionName: functionName,
          InvocationType: "RequestResponse",
          Payload: JSON.stringify(lambdaEvent),
        })
        .promise();
    } catch (ex) {
      this.logger.error(ex);
      throw new UnexpectedLambdaExceptionError();
    }

    this.logger.debug(
      `Lambda completed with StatusCode=${result.StatusCode} and FunctionError=${result.FunctionError}`
    );
    if (result.StatusCode === 200) {
      const parsedPayload = JSON.parse(result.Payload as string);

      return parsedPayload.response as CognitoUserPoolResponse;
    } else {
      this.logger.error(result.FunctionError);
      throw new UnexpectedLambdaExceptionError();
    }
  }
}
