import { AttributeListType } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Logger } from "../../log";
import { Lambda } from "../lambda";
import { attributesToRecord } from "../userPoolClient";

export type PostAuthenticationTrigger = (params: {
  clientId: string;
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
  source,
  userPoolId,
  clientId,
  username,
  userAttributes,
}): Promise<void> => {
  try {
    await lambda.invoke("PostAuthentication", {
      userPoolId,
      clientId,
      username,
      userAttributes: attributesToRecord(userAttributes),
      triggerSource: source,
    });
  } catch (err) {
    logger.warn("PostAuthentication error, ignored", err);
  }
};
