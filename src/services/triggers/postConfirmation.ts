import { CognitoClient } from "../index";
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

export const PostConfirmation = ({
  lambda,
  cognitoClient,
}: {
  lambda: Lambda;
  cognitoClient: CognitoClient;
}): PostConfirmationTrigger => async ({
  source,
  userPoolId,
  clientId,
  username,
  userAttributes,
}): Promise<void> => {
  try {
    const userPool = await cognitoClient.getUserPoolForClientId(clientId);
    if (!userPool) {
      throw new ResourceNotFoundError();
    }

    await lambda.invoke("PostConfirmation", {
      userPoolId,
      clientId,
      username,
      triggerSource: source,
      userAttributes: attributesToRecord(userAttributes),
    });
  } catch (ex) {
    console.error(ex);
  }
};
