import { UserPool } from "../index";
import { Lambda } from "../lambda";
import { attributesToRecord } from "../userPool";

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
}: {
  lambda: Lambda;
  userPool: UserPool;
}): PostConfirmationTrigger => async ({
  source,
  userPoolId,
  clientId,
  username,
  userAttributes,
}): Promise<void> => {
  try {
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
