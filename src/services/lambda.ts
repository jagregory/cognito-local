import {
  CreateAuthChallengeTriggerEvent,
  CustomEmailSenderTriggerEvent,
  CustomMessageTriggerEvent,
  DefineAuthChallengeTriggerEvent,
  PostAuthenticationTriggerEvent,
  PostConfirmationTriggerEvent,
  PreAuthenticationTriggerEvent,
  PreSignUpTriggerEvent,
  UserMigrationTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from "aws-lambda";
import type { Lambda as LambdaClient } from "aws-sdk";
import { InvocationResponse } from "aws-sdk/clients/lambda";
import { version as awsSdkVersion } from "aws-sdk/package.json";
import {
  InvalidLambdaResponseError,
  UnexpectedLambdaExceptionError,
  UserLambdaValidationError,
} from "../errors";
import { Context } from "./context";

type CognitoUserPoolEvent =
  | CreateAuthChallengeTriggerEvent
  | CustomEmailSenderTriggerEvent
  | CustomMessageTriggerEvent
  | DefineAuthChallengeTriggerEvent
  | PostAuthenticationTriggerEvent
  | PostConfirmationTriggerEvent
  | PreAuthenticationTriggerEvent
  | PreSignUpTriggerEvent
  | UserMigrationTriggerEvent
  | VerifyAuthChallengeResponseTriggerEvent;

interface EventCommonParameters {
  clientId: string;
  userAttributes: Record<string, string>;
  username: string;
  userPoolId: string;
}

interface CustomMessageEvent extends EventCommonParameters {
  clientMetadata: Record<string, string> | undefined;
  codeParameter: string;
  triggerSource:
    | "CustomMessage_AdminCreateUser"
    | "CustomMessage_Authentication"
    | "CustomMessage_ForgotPassword"
    | "CustomMessage_ResendCode"
    | "CustomMessage_SignUp"
    | "CustomMessage_UpdateUserAttribute"
    | "CustomMessage_VerifyUserAttribute";
  usernameParameter: string;
}

interface UserMigrationEvent extends EventCommonParameters {
  clientMetadata: Record<string, string> | undefined;
  password: string;
  triggerSource: "UserMigration_Authentication";
  validationData: Record<string, string> | undefined;
}

interface PreSignUpEvent extends EventCommonParameters {
  clientMetadata: Record<string, string> | undefined;
  triggerSource:
    | "PreSignUp_AdminCreateUser"
    | "PreSignUp_ExternalProvider"
    | "PreSignUp_SignUp";
  validationData: Record<string, string> | undefined;
}

interface PostAuthenticationEvent extends EventCommonParameters {
  clientMetadata: Record<string, string> | undefined;
  triggerSource: "PostAuthentication_Authentication";
}

interface PostConfirmationEvent extends EventCommonParameters {
  triggerSource:
    | "PostConfirmation_ConfirmSignUp"
    | "PostConfirmation_ConfirmForgotPassword";
  clientMetadata: Record<string, string> | undefined;
}

export type CognitoUserPoolResponse = CognitoUserPoolEvent["response"];

export interface FunctionConfig {
  CustomMessage?: string;
  PostAuthentication?: string;
  PostConfirmation?: string;
  PreSignUp?: string;
  UserMigration?: string;
}

export interface Lambda {
  enabled(lambda: keyof FunctionConfig): boolean;
  invoke(
    ctx: Context,
    lambda: "CustomMessage",
    event: CustomMessageEvent
  ): Promise<CognitoUserPoolResponse>;
  invoke(
    ctx: Context,
    lambda: "UserMigration",
    event: UserMigrationEvent
  ): Promise<CognitoUserPoolResponse>;
  invoke(
    ctx: Context,
    lambda: "PreSignUp",
    event: PreSignUpEvent
  ): Promise<CognitoUserPoolResponse>;
  invoke(
    ctx: Context,
    lambda: "PostAuthentication",
    event: PostAuthenticationEvent
  ): Promise<CognitoUserPoolResponse>;
  invoke(
    ctx: Context,
    lambda: "PostConfirmation",
    event: PostConfirmationEvent
  ): Promise<CognitoUserPoolResponse>;
}

export class LambdaService implements Lambda {
  private readonly config: FunctionConfig;
  private readonly lambdaClient: LambdaClient;

  public constructor(config: FunctionConfig, lambdaClient: LambdaClient) {
    this.config = config;
    this.lambdaClient = lambdaClient;
  }

  public enabled(lambda: keyof FunctionConfig): boolean {
    return !!this.config[lambda];
  }

  public async invoke(
    ctx: Context,
    trigger: keyof FunctionConfig,
    event:
      | CustomMessageEvent
      | PostAuthenticationEvent
      | PostConfirmationEvent
      | PreSignUpEvent
      | UserMigrationEvent
  ) {
    const functionName = this.config[trigger];
    if (!functionName) {
      throw new Error(`${trigger} trigger not configured`);
    }

    const lambdaEvent = this.createLambdaEvent(event);

    ctx.logger.debug(
      {
        functionName,
        event: JSON.stringify(lambdaEvent, undefined, 2),
      },
      `Invoking "${functionName}" with event`
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
      ctx.logger.error({ error: ex });
      throw new UnexpectedLambdaExceptionError();
    }

    ctx.logger.debug(
      `Lambda completed with StatusCode=${result.StatusCode} and FunctionError=${result.FunctionError}`
    );
    if (result.StatusCode === 200) {
      try {
        const parsedPayload = JSON.parse(result.Payload as string);

        return parsedPayload.response as CognitoUserPoolResponse;
      } catch (err) {
        ctx.logger.error({ error: err });
        throw new InvalidLambdaResponseError();
      }
    } else {
      ctx.logger.error({ error: result.FunctionError });
      throw new UserLambdaValidationError(result.FunctionError);
    }
  }

  private createLambdaEvent(
    event:
      | CustomMessageEvent
      | PostAuthenticationEvent
      | PostConfirmationEvent
      | PreSignUpEvent
      | UserMigrationEvent
  ): CognitoUserPoolEvent {
    const version = "0"; // TODO: how do we know what this is?
    const callerContext = {
      awsSdkVersion,
      clientId: event.clientId,
    };
    const region = "local"; // TODO: pull from above,

    switch (event.triggerSource) {
      case "PostAuthentication_Authentication": {
        return {
          version,
          callerContext,
          region,
          userPoolId: event.userPoolId,
          triggerSource: event.triggerSource,
          userName: event.username,
          request: {
            userAttributes: event.userAttributes,
            clientMetadata: event.clientMetadata,
            newDeviceUsed: false,
          },
          response: {},
        };
      }

      case "PostConfirmation_ConfirmForgotPassword":
      case "PostConfirmation_ConfirmSignUp": {
        return {
          version,
          callerContext,
          region,
          userPoolId: event.userPoolId,
          triggerSource: event.triggerSource,
          userName: event.username,
          request: {
            userAttributes: event.userAttributes,
            clientMetadata: event.clientMetadata,
          },
          response: {},
        };
      }

      case "PreSignUp_AdminCreateUser":
      case "PreSignUp_ExternalProvider":
      case "PreSignUp_SignUp": {
        return {
          version,
          callerContext,
          region,
          userPoolId: event.userPoolId,
          triggerSource: event.triggerSource,
          userName: event.username,
          request: {
            userAttributes: event.userAttributes,
            clientMetadata: event.clientMetadata,
            validationData: event.validationData,
          },
          response: {
            autoConfirmUser: false,
            autoVerifyEmail: false,
            autoVerifyPhone: false,
          },
        };
      }

      case "UserMigration_Authentication": {
        return {
          version,
          callerContext,
          region,
          userPoolId: event.userPoolId,
          triggerSource: event.triggerSource,
          userName: event.username,
          request: {
            clientMetadata: event.clientMetadata,
            password: event.password,
            validationData: event.validationData,
          },
          response: {
            desiredDeliveryMediums: [],
            finalUserStatus: undefined,
            forceAliasCreation: undefined,
            messageAction: undefined,
            userAttributes: {},
          },
        };
      }

      case "CustomMessage_SignUp":
      case "CustomMessage_AdminCreateUser":
      case "CustomMessage_ResendCode":
      case "CustomMessage_ForgotPassword":
      case "CustomMessage_UpdateUserAttribute":
      case "CustomMessage_VerifyUserAttribute":
      case "CustomMessage_Authentication": {
        return {
          version,
          callerContext,
          region,
          userPoolId: event.userPoolId,
          triggerSource: event.triggerSource,
          userName: event.username,
          request: {
            clientMetadata: event.clientMetadata,
            codeParameter: event.codeParameter,
            usernameParameter: event.usernameParameter,
            userAttributes: {},
          },
          response: {
            smsMessage: "",
            emailMessage: "",
            emailSubject: "",
          },
        };
      }

      default: {
        throw new Error("Unsupported Trigger Source");
      }
    }
  }
}
