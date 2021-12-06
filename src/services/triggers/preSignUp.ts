import { AttributeListType } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Lambda } from "../lambda";
import { attributesToRecord } from "../userPoolService";
import { Trigger } from "./trigger";

interface PreSignUpTriggerResponse {
  autoConfirmUser?: boolean;
  autoVerifyPhone?: boolean;
  autoVerifyEmail?: boolean;
}

export type PreSignUpTrigger = Trigger<
  {
    clientId: string;
    source:
      | "PreSignUp_AdminCreateUser"
      | "PreSignUp_ExternalProvider"
      | "PreSignUp_SignUp";
    userAttributes: AttributeListType;
    username: string;
    userPoolId: string;

    /**
     * One or more name-value pairs containing the validation data in the request to register a user. The validation data
     * is set and then passed from the client in the request to register a user. You can pass this data to your Lambda
     * function by using the ClientMetadata parameter in the InitiateAuth and AdminInitiateAuth API actions.
     *
     * Source: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html#cognito-user-pools-lambda-trigger-syntax-pre-signup
     */
    clientMetadata: Record<string, string> | undefined;

    /**
     * One or more name-value pairs containing the validation data in the request to register a user. The validation data
     * is set and then passed from the client in the request to register a user. You can pass this data to your Lambda
     * function by using the ClientMetadata parameter in the InitiateAuth and AdminInitiateAuth API actions.
     *
     * Source: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html#cognito-user-pools-lambda-trigger-syntax-pre-signup
     */
    validationData: Record<string, string> | undefined;
  },
  PreSignUpTriggerResponse
>;

type PreSignUpServices = {
  lambda: Lambda;
};

export const PreSignUp =
  ({ lambda }: PreSignUpServices): PreSignUpTrigger =>
  async (
    ctx,
    {
      clientId,
      clientMetadata,
      source,
      userAttributes,
      username,
      userPoolId,
      validationData,
    }
  ) =>
    lambda.invoke(ctx, "PreSignUp", {
      clientId,
      clientMetadata,
      triggerSource: source,
      userAttributes: attributesToRecord(userAttributes),
      username,
      userPoolId,
      validationData,
    });
