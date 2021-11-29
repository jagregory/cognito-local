import { AttributeListType } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Logger } from "../../log";
import { CognitoService } from "../cognitoService";
import { Lambda } from "../lambda";
import { attributesToRecord } from "../userPoolService";
import { ResourceNotFoundError } from "../../errors";

export type PostConfirmationTrigger = (params: {
  source:
    | "PostConfirmation_ConfirmSignUp"
    | "PostConfirmation_ConfirmForgotPassword";
  clientId: string;

  /**
   * One or more key-value pairs that you can provide as custom input to the Lambda function that you specify for the
   * post confirmation trigger. You can pass this data to your Lambda function by using the ClientMetadata parameter in
   * the following API actions: AdminConfirmSignUp, ConfirmForgotPassword, ConfirmSignUp, and SignUp.
   *
   * source: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-confirmation.html#cognito-user-pools-lambda-trigger-syntax-post-confirmation
   */
  clientMetadata?: Record<string, string>;
  userAttributes: AttributeListType;
  username: string;
  userPoolId: string;
}) => Promise<void>;

interface PostConfirmationServices {
  lambda: Lambda;
  cognitoClient: CognitoService;
}

export const PostConfirmation = (
  { lambda, cognitoClient }: PostConfirmationServices,
  logger: Logger
): PostConfirmationTrigger => async ({
  clientId,
  clientMetadata,
  source,
  userAttributes,
  username,
  userPoolId,
}): Promise<void> => {
  const userPool = await cognitoClient.getUserPoolForClientId(clientId);
  if (!userPool) {
    throw new ResourceNotFoundError();
  }

  try {
    await lambda.invoke("PostConfirmation", {
      clientId,
      clientMetadata,
      triggerSource: source,
      userAttributes: attributesToRecord(userAttributes),
      username,
      userPoolId,
    });
  } catch (ex) {
    logger.error(ex);
  }
};
