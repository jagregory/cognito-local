import type { AttributeListType } from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { CustomMessageTriggerResponse, Lambda } from "../lambda";
import { attributesToRecord } from "../userPoolService";
import type { Trigger } from "./trigger";

const AWS_USERNAME_PARAMETER = "{username}";
const AWS_CODE_PARAMETER = "{####}";

export type CustomMessageTrigger = Trigger<
  {
    source:
      | "CustomMessage_SignUp"
      | "CustomMessage_AdminCreateUser"
      | "CustomMessage_ResendCode"
      | "CustomMessage_ForgotPassword"
      | "CustomMessage_UpdateUserAttribute"
      | "CustomMessage_VerifyUserAttribute"
      | "CustomMessage_Authentication";
    userPoolId: string;
    clientId: string | null;
    username: string;
    code: string;
    userAttributes: AttributeListType;

    /**
     * One or more key-value pairs that you can provide as custom input to the Lambda function that you specify for the
     * custom message trigger. You can pass this data to your Lambda function by using the ClientMetadata parameter in the
     * following API actions:
     *
     * - AdminResetUserPassword
     * - AdminRespondToAuthChallenge
     * - AdminUpdateUserAttributes
     * - ForgotPassword
     * - GetUserAttributeVerificationCode
     * - ResendConfirmationCode
     * - SignUp
     * - UpdateUserAttributes
     *
     * Source: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-custom-message.html#cognito-user-pools-lambda-trigger-syntax-custom-message
     */
    clientMetadata: Record<string, string> | undefined;
  },
  CustomMessageTriggerResponse | null
>;

interface CustomMessageServices {
  lambda: Lambda;
}

export const CustomMessage =
  ({ lambda }: CustomMessageServices): CustomMessageTrigger =>
  async (
    ctx,
    {
      clientId,
      clientMetadata,
      code,
      source,
      userAttributes,
      username,
      userPoolId,
    },
  ) => {
    try {
      const response = await lambda.invoke(ctx, "CustomMessage", {
        clientId,
        clientMetadata,
        codeParameter: AWS_CODE_PARAMETER,
        triggerSource: source,
        userAttributes: attributesToRecord(userAttributes),
        username,
        usernameParameter: AWS_USERNAME_PARAMETER,
        userPoolId,
      });

      return {
        emailMessage: response.emailMessage
          ?.replace(AWS_CODE_PARAMETER, code)
          .replace(AWS_USERNAME_PARAMETER, username),
        emailSubject: response.emailSubject,
        smsMessage: response.smsMessage
          ?.replace(AWS_CODE_PARAMETER, code)
          .replace(AWS_USERNAME_PARAMETER, username),
      };
    } catch (ex) {
      ctx.logger.error(ex);
      return null;
    }
  };
