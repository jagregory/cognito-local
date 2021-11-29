import { AttributeListType } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Logger } from "../../log";
import { Lambda } from "../lambda";
import { attributesToRecord } from "../userPoolService";

export type PostAuthenticationTrigger = (params: {
  clientId: string;
  /**
   * One or more key-value pairs that you can provide as custom input to the Lambda function that you specify for the
   * post authentication trigger. You can pass this data to your Lambda function by using the ClientMetadata parameter
   * in the AdminRespondToAuthChallenge and RespondToAuthChallenge API actions.
   *
   * Source: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-authentication.html
   */
  clientMetadata: Record<string, string> | undefined;
  source: "PostAuthentication_Authentication";
  userAttributes: AttributeListType;
  username: string;
  userPoolId: string;
}) => Promise<void>;

type PostAuthenticationServices = {
  lambda: Lambda;
};

export const PostAuthentication = (
  { lambda }: PostAuthenticationServices,
  logger: Logger
): PostAuthenticationTrigger => async ({
  clientId,
  clientMetadata,
  source,
  userAttributes,
  username,
  userPoolId,
}): Promise<void> => {
  try {
    await lambda.invoke("PostAuthentication", {
      clientId,
      clientMetadata,
      triggerSource: source,
      userAttributes: attributesToRecord(userAttributes),
      username,
      userPoolId,
    });
  } catch (err) {
    logger.warn("PostAuthentication error, ignored", err);
  }
};
