import { AttributeListType } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Logger } from "../../log";
import { CognitoClient } from "../index";
import { Lambda } from "../lambda";
import { attributesToRecord } from "../userPoolClient";
import { ResourceNotFoundError } from "../../errors";

interface CustomMessageResponse {
  emailMessage?: string;
  emailSubject?: string;
  smsMessage?: string;
}

export type CustomMessageTrigger = (params: {
  source:
    | "CustomMessage_SignUp"
    | "CustomMessage_AdminCreateUser"
    | "CustomMessage_ResendCode"
    | "CustomMessage_ForgotPassword"
    | "CustomMessage_UpdateUserAttribute"
    | "CustomMessage_VerifyUserAttribute"
    | "CustomMessage_Authentication";
  userPoolId: string;
  clientId: string;
  username: string;
  code: string;
  userAttributes: AttributeListType;
}) => Promise<CustomMessageResponse | null>;

export const CustomMessage = (
  {
    lambda,
    cognitoClient,
  }: {
    lambda: Lambda;
    cognitoClient: CognitoClient;
  },
  logger: Logger
): CustomMessageTrigger => async ({
  clientId,
  code,
  source,
  userAttributes,
  username,
  userPoolId,
}): Promise<CustomMessageResponse | null> => {
  const userPool = await cognitoClient.getUserPoolForClientId(clientId);
  if (!userPool) {
    throw new ResourceNotFoundError();
  }

  try {
    const response = await lambda.invoke("CustomMessage", {
      clientId,
      code,
      triggerSource: source,
      userAttributes: attributesToRecord(userAttributes),
      username,
      userPoolId,
    });

    return {
      emailMessage: response.emailMessage,
      emailSubject: response.emailSubject,
      smsMessage: response.smsMessage,
    };
  } catch (ex) {
    logger.error(ex);
    return null;
  }
};
