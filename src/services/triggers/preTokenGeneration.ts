import { AttributeListType } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Lambda, PreTokenGenerationTriggerResponse } from "../lambda";
import { attributesToRecord } from "../userPoolService";
import { Trigger } from "./trigger";

export type Source =
  | "AuthenticateDevice"
  | "Authentication"
  | "HostedAuth"
  | "NewPasswordChallenge"
  | "RefreshTokens";

export type PreTokenGenerationTrigger = Trigger<
  {
    clientId: string;
    userAttributes: AttributeListType;
    username: string;
    userPoolId: string;

    /**
     * One or more key-value pairs that you can provide as custom input to the Lambda function that you specify for the
     * pre token generation trigger. You can pass this data to your Lambda function by using the ClientMetadata
     * parameter in the AdminRespondToAuthChallenge and RespondToAuthChallenge API actions.
     *
     * Source: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html#cognito-user-pools-lambda-trigger-syntax-pre-token-generation
     */
    clientMetadata: Record<string, string> | undefined;

    source: Source;

    /**
     * The input object containing the current group configuration. It includes groupsToOverride, iamRolesToOverride, and
     * preferredRole.
     */
    groupConfiguration: {
      /**
       * A list of the group names that are associated with the user that the identity token is issued for.
       */
      groupsToOverride: string[] | undefined;

      /**
       * A list of the current IAM roles associated with these groups.
       */
      iamRolesToOverride: string[] | undefined;

      /**
       * A string indicating the preferred IAM role.
       */
      preferredRole: string | undefined;
    };
  },
  PreTokenGenerationTriggerResponse
>;

type PreTokenGenerationServices = {
  lambda: Lambda;
};

export const PreTokenGeneration =
  ({ lambda }: PreTokenGenerationServices): PreTokenGenerationTrigger =>
  async (
    ctx,
    {
      clientId,
      clientMetadata,
      groupConfiguration,
      source,
      userAttributes,
      username,
      userPoolId,
    }
  ) =>
    lambda.invoke(ctx, "PreTokenGeneration", {
      clientId,
      clientMetadata,
      groupConfiguration,
      triggerSource: `TokenGeneration_${source}`,
      userAttributes: attributesToRecord(userAttributes),
      username,
      userPoolId,
    });
