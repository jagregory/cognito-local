import { Logger } from "../../log";
import { CognitoClient } from "../cognitoClient";
import { Lambda } from "../lambda";
import { attributesToRecord } from "../userPoolClient";
import { ResourceNotFoundError } from "../../errors";

export type PostConfirmationTrigger = (params: {
  source:
    | "PostConfirmation_ConfirmSignUp"
    | "PostConfirmation_ConfirmForgotPassword";
  userPoolId: string;
  clientId: string;
  username: string;
  userAttributes: readonly { Name: string; Value: string }[];
}) => Promise<void>;

export const PostConfirmation = (
  {
    lambda,
    cognitoClient,
  }: {
    lambda: Lambda;
    cognitoClient: CognitoClient;
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
