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
  userPoolId: string;
  clientId: string;
  username: string;
  userAttributes: AttributeListType;
}) => Promise<void>;

export const PostConfirmation = (
  {
    lambda,
    cognitoClient,
  }: {
    lambda: Lambda;
    cognitoClient: CognitoService;
  },
  logger: Logger
): PostConfirmationTrigger => async ({
  source,
  userPoolId,
  clientId,
  username,
  userAttributes,
}): Promise<void> => {
  const userPool = await cognitoClient.getUserPoolForClientId(clientId);
  if (!userPool) {
    throw new ResourceNotFoundError();
  }

  try {
    await lambda.invoke("PostConfirmation", {
      userPoolId,
      clientId,
      username,
      triggerSource: source,
      userAttributes: attributesToRecord(userAttributes),
    });
  } catch (ex) {
    logger.error(ex);
  }
};
