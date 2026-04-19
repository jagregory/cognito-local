import type {
  CreateAuthChallengeTriggerEvent,
  CustomEmailSenderTriggerEvent,
  CustomMessageTriggerEvent,
  DefineAuthChallengeTriggerEvent,
  PostAuthenticationTriggerEvent,
  PostConfirmationTriggerEvent,
  PreAuthenticationTriggerEvent,
  PreSignUpTriggerEvent,
  PreTokenGenerationTriggerEvent,
  PreTokenGenerationV2TriggerEvent,
  UserMigrationTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from "aws-lambda";
import type { Lambda as LambdaClient } from "aws-sdk";
import type { InvocationResponse } from "aws-sdk/clients/lambda";
import { version as awsSdkVersion } from "aws-sdk/package.json";
import {
  InvalidLambdaResponseError,
  UnexpectedLambdaExceptionError,
  UserLambdaValidationError,
} from "../errors";
import type { Context } from "./context";

type CognitoUserPoolEvent =
  | CreateAuthChallengeTriggerEvent
  | CustomEmailSenderTriggerEvent
  | CustomMessageTriggerEvent
  | DefineAuthChallengeTriggerEvent
  | PostAuthenticationTriggerEvent
  | PostConfirmationTriggerEvent
  | PreAuthenticationTriggerEvent
  | PreSignUpTriggerEvent
  | PreTokenGenerationTriggerEvent
  | PreTokenGenerationV2TriggerEvent
  | UserMigrationTriggerEvent
  | VerifyAuthChallengeResponseTriggerEvent;

interface EventCommonParameters {
  clientId: string;
  userAttributes: Record<string, string>;
  username: string;
  userPoolId: string;
}

interface CustomEmailSenderEvent
  extends Omit<EventCommonParameters, "clientId"> {
  clientId: string | null;
  code: string;
  clientMetadata: Record<string, string> | undefined;
  triggerSource:
    | "CustomEmailSender_AdminCreateUser"
    | "CustomEmailSender_ForgotPassword"
    | "CustomEmailSender_ResendCode"
    | "CustomEmailSender_SignUp"
    | "CustomEmailSender_UpdateUserAttribute"
    | "CustomEmailSender_VerifyUserAttribute";
}

interface CustomMessageEvent extends Omit<EventCommonParameters, "clientId"> {
  clientId: string | null;
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

interface PreTokenGenerationEvent extends EventCommonParameters {
  /**
   * One or more key-value pairs that you can provide as custom input to the Lambda function that you specify for the
   * pre token generation trigger. You can pass this data to your Lambda function by using the ClientMetadata parameter
   * in the AdminRespondToAuthChallenge and RespondToAuthChallenge API actions.
   */
  clientMetadata: Record<string, string> | undefined;

  triggerSource:
    | "TokenGeneration_AuthenticateDevice"
    | "TokenGeneration_Authentication"
    | "TokenGeneration_HostedAuth"
    | "TokenGeneration_NewPasswordChallenge"
    | "TokenGeneration_RefreshTokens";

  /**
   * The input object containing the current group configuration. It includes groupsToOverride, iamRolesToOverride, and
   * preferredRole.
   */
  groupConfiguration: {
    /**
     * A list of the group names that are associated with the user that the identity token is issued for.
     */
    groupsToOverride: readonly string[] | undefined;

    /**
     * A list of the current IAM roles associated with these groups.
     */
    iamRolesToOverride: readonly string[] | undefined;

    /**
     * A string indicating the preferred IAM role.
     */
    preferredRole: string | undefined;
  };
}

interface PreTokenGenerationV2Event extends PreTokenGenerationEvent {
  /**
   * OAuth scopes that are requested for the access token this trigger is about to mint. Only set for V2 payloads.
   *
   * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html
   */
  scopes: readonly string[] | undefined;
}

interface PostAuthenticationEvent extends EventCommonParameters {
  clientMetadata: Record<string, string> | undefined;
  triggerSource: "PostAuthentication_Authentication";
}

interface PostConfirmationEvent
  extends Omit<EventCommonParameters, "clientId"> {
  triggerSource:
    | "PostConfirmation_ConfirmSignUp"
    | "PostConfirmation_ConfirmForgotPassword";
  clientMetadata: Record<string, string> | undefined;
  clientId: string | null;
}

/**
 * AWS's real CreateUserPool/UpdateUserPool API accepts a `PreTokenGenerationConfig` object specifying
 * which version of the pre token generation trigger to invoke. When present, it takes precedence over
 * the legacy string-valued `PreTokenGeneration` entry. See
 * https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html
 * for the full semantics.
 */
export interface PreTokenGenerationConfig {
  LambdaArn: string;
  LambdaVersion: "V1_0" | "V2_0";
}

export interface FunctionConfig {
  CustomMessage?: string;
  PostAuthentication?: string;
  PostConfirmation?: string;
  PreSignUp?: string;
  /**
   * Legacy V1 pre token generation trigger. Overridden by `PreTokenGenerationConfig` when that field is set.
   */
  PreTokenGeneration?: string;
  /**
   * Configuration-object form of the pre token generation trigger. Set `LambdaVersion: "V2_0"` to opt into
   * the V2 payload shape which can customise both the access token and the ID token independently.
   * `LambdaVersion: "V1_0"` is accepted and is equivalent to the legacy `PreTokenGeneration` entry.
   */
  PreTokenGenerationConfig?: PreTokenGenerationConfig;
  UserMigration?: string;
  CustomEmailSender?: string;
}

export type CustomMessageTriggerResponse =
  CustomMessageTriggerEvent["response"];
export type UserMigrationTriggerResponse =
  UserMigrationTriggerEvent["response"];
export type PreSignUpTriggerResponse = PreSignUpTriggerEvent["response"];
export type PreTokenGenerationTriggerResponse =
  PreTokenGenerationTriggerEvent["response"];
export type PreTokenGenerationV2TriggerResponse =
  PreTokenGenerationV2TriggerEvent["response"];
export type PostAuthenticationTriggerResponse =
  PostAuthenticationTriggerEvent["response"];
export type PostConfirmationTriggerResponse =
  PostConfirmationTriggerEvent["response"];
export type CustomEmailSenderTriggerResponse =
  CustomEmailSenderTriggerEvent["response"];

/**
 * Triggers that can be asked about / invoked on a `Lambda` instance. `PreTokenGenerationConfig` is
 * a config-only key (resolved into `PreTokenGeneration` or `PreTokenGenerationV2`), so it is excluded.
 */
export type LambdaTrigger =
  | Exclude<keyof FunctionConfig, "PreTokenGenerationConfig">
  | "PreTokenGenerationV2";

export interface Lambda {
  enabled(lambda: LambdaTrigger): boolean;
  invoke(
    ctx: Context,
    lambda: "CustomMessage",
    event: CustomMessageEvent,
  ): Promise<CustomMessageTriggerResponse>;
  invoke(
    ctx: Context,
    lambda: "UserMigration",
    event: UserMigrationEvent,
  ): Promise<UserMigrationTriggerResponse>;
  invoke(
    ctx: Context,
    lambda: "PreSignUp",
    event: PreSignUpEvent,
  ): Promise<PreSignUpTriggerResponse>;
  invoke(
    ctx: Context,
    lambda: "PreTokenGeneration",
    event: PreTokenGenerationEvent,
  ): Promise<PreTokenGenerationTriggerResponse>;
  invoke(
    ctx: Context,
    lambda: "PreTokenGenerationV2",
    event: PreTokenGenerationV2Event,
  ): Promise<PreTokenGenerationV2TriggerResponse>;
  invoke(
    ctx: Context,
    lambda: "PostAuthentication",
    event: PostAuthenticationEvent,
  ): Promise<PostAuthenticationTriggerResponse>;
  invoke(
    ctx: Context,
    lambda: "PostConfirmation",
    event: PostConfirmationEvent,
  ): Promise<PostConfirmationTriggerResponse>;
  invoke(
    ctx: Context,
    lambda: "CustomEmailSender",
    event: CustomEmailSenderEvent,
  ): Promise<CustomEmailSenderTriggerResponse>;
}

export class LambdaService implements Lambda {
  private readonly config: FunctionConfig;
  private readonly lambdaClient: LambdaClient;

  public constructor(config: FunctionConfig, lambdaClient: LambdaClient) {
    this.config = config;
    this.lambdaClient = lambdaClient;
  }

  public enabled(lambda: LambdaTrigger): boolean {
    const resolved = this.resolvePreTokenGeneration();
    if (lambda === "PreTokenGenerationV2") {
      return resolved.version === "V2_0";
    }
    if (lambda === "PreTokenGeneration") {
      return resolved.version === "V1_0";
    }
    return !!this.config[lambda];
  }

  /**
   * Resolves the user-supplied pre token generation configuration into a single function name + version.
   * `PreTokenGenerationConfig` wins over the legacy `PreTokenGeneration` string when both are present.
   */
  private resolvePreTokenGeneration():
    | { version: "V1_0" | "V2_0"; functionName: string }
    | { version: "none" } {
    if (this.config.PreTokenGenerationConfig?.LambdaArn) {
      return {
        version: this.config.PreTokenGenerationConfig.LambdaVersion,
        functionName: this.config.PreTokenGenerationConfig.LambdaArn,
      };
    }
    if (this.config.PreTokenGeneration) {
      return {
        version: "V1_0",
        functionName: this.config.PreTokenGeneration,
      };
    }
    return { version: "none" };
  }

  private resolveFunctionName(trigger: LambdaTrigger): string | undefined {
    if (trigger === "PreTokenGeneration") {
      const resolved = this.resolvePreTokenGeneration();
      return resolved.version === "V1_0" ? resolved.functionName : undefined;
    }
    if (trigger === "PreTokenGenerationV2") {
      const resolved = this.resolvePreTokenGeneration();
      return resolved.version === "V2_0" ? resolved.functionName : undefined;
    }
    // Every remaining trigger key maps to a plain function-name string in FunctionConfig.
    const value: string | undefined = this.config[trigger];
    return value;
  }

  public async invoke(
    ctx: Context,
    trigger: LambdaTrigger,
    event:
      | CustomMessageEvent
      | CustomEmailSenderEvent
      | PostAuthenticationEvent
      | PostConfirmationEvent
      | PreSignUpEvent
      | PreTokenGenerationEvent
      | PreTokenGenerationV2Event
      | UserMigrationEvent,
  ) {
    const functionName = this.resolveFunctionName(trigger);
    if (!functionName) {
      throw new Error(`${trigger} trigger not configured`);
    }

    const lambdaEvent = this.createLambdaEvent(event);

    ctx.logger.debug(
      {
        functionName,
        event: JSON.stringify(lambdaEvent, undefined, 2),
      },
      `Invoking "${functionName}" with event`,
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
      ctx.logger.error(ex);
      throw new UnexpectedLambdaExceptionError();
    }

    ctx.logger.debug(
      `Lambda completed with StatusCode=${result.StatusCode} and FunctionError=${result.FunctionError}`,
    );
    if (!result.FunctionError) {
      try {
        const parsedPayload = JSON.parse(result.Payload as string);

        return parsedPayload.response;
      } catch (err) {
        ctx.logger.error(err);
        throw new InvalidLambdaResponseError();
      }
    } else {
      ctx.logger.error({ result }, result.FunctionError);

      if (result.FunctionError === "Unhandled" && result.Payload) {
        const parsedPayload = JSON.parse(result.Payload as string);

        if (parsedPayload.errorMessage) {
          throw new UserLambdaValidationError(
            `${functionName} failed with error ${parsedPayload.errorMessage}.`,
          );
        }
      }

      throw new UserLambdaValidationError(result.FunctionError);
    }
  }

  private createLambdaEvent(
    event:
      | CustomMessageEvent
      | CustomEmailSenderEvent
      | PostAuthenticationEvent
      | PostConfirmationEvent
      | PreSignUpEvent
      | PreTokenGenerationEvent
      | PreTokenGenerationV2Event
      | UserMigrationEvent,
  ): CognitoUserPoolEvent {
    const version = "0"; // TODO: how do we know what this is?
    const callerContext = {
      awsSdkVersion,

      // client id can be null, even though the types don't allow it
      clientId: event.clientId as string,
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

      case "TokenGeneration_AuthenticateDevice":
      case "TokenGeneration_Authentication":
      case "TokenGeneration_HostedAuth":
      case "TokenGeneration_NewPasswordChallenge":
      case "TokenGeneration_RefreshTokens": {
        const triggerSource = event.triggerSource;
        if ("scopes" in event) {
          const v2Event: PreTokenGenerationV2TriggerEvent = {
            version: "2",
            callerContext,
            region,
            userPoolId: event.userPoolId,
            triggerSource,
            userName: event.username,
            request: {
              userAttributes: event.userAttributes,
              groupConfiguration: {},
              clientMetadata: event.clientMetadata,
              scopes: event.scopes ? [...event.scopes] : [],
            },
            response: {
              claimsAndScopeOverrideDetails: {},
            },
          } as PreTokenGenerationV2TriggerEvent;
          return v2Event;
        }
        const v1Event: PreTokenGenerationTriggerEvent = {
          version,
          callerContext,
          region,
          userPoolId: event.userPoolId,
          triggerSource,
          userName: event.username,
          request: {
            userAttributes: event.userAttributes,
            groupConfiguration: {},
            clientMetadata: event.clientMetadata,
          },
          response: {
            claimsOverrideDetails: {},
          },
        } as PreTokenGenerationTriggerEvent;
        return v1Event;
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
            linkParameter: "",
            usernameParameter: event.usernameParameter,
            userAttributes: event.userAttributes,
          },
          response: {
            smsMessage: "",
            emailMessage: "",
            emailSubject: "",
          },
        };
      }

      case "CustomEmailSender_SignUp":
      case "CustomEmailSender_ResendCode":
      case "CustomEmailSender_ForgotPassword":
      case "CustomEmailSender_UpdateUserAttribute":
      case "CustomEmailSender_VerifyUserAttribute":
      case "CustomEmailSender_AdminCreateUser":
        return {
          version,
          region,
          userPoolId: event.userPoolId,
          triggerSource: event.triggerSource,
          userName: event.username,
          callerContext,
          request: {
            type: "customEmailSenderRequestV1",
            code: event.code,
            userAttributes: event.userAttributes,
            clientMetadata: event.clientMetadata,
          },
          response: {},
        };
      default: {
        throw new Error("Unsupported Trigger Source");
      }
    }
  }
}
