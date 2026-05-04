import type { DefineAuthChallengeTriggerEvent } from "aws-lambda";
import type { AttributeListType } from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Lambda } from "../lambda";
import { attributesToRecord } from "../userPoolService";
import type { Trigger } from "./trigger";

export type DefineAuthChallengeTriggerResponse =
  DefineAuthChallengeTriggerEvent["response"];

export type DefineAuthChallengeTrigger = Trigger<
  {
    clientId: string;
    userAttributes: AttributeListType;
    username: string;
    userPoolId: string;
    session: Array<{
      challengeName: string;
      challengeResult: boolean;
      challengeMetadata?: string;
    }>;
    userNotFound?: boolean;
    clientMetadata?: Record<string, string>;
  },
  DefineAuthChallengeTriggerResponse
>;

type DefineAuthChallengeServices = {
  lambda: Lambda;
};

export const DefineAuthChallenge =
  ({ lambda }: DefineAuthChallengeServices): DefineAuthChallengeTrigger =>
  async (
    ctx,
    {
      clientId,
      userAttributes,
      username,
      userPoolId,
      session,
      userNotFound,
      clientMetadata,
    },
  ) =>
    lambda.invoke(ctx, "DefineAuthChallenge", {
      clientId,
      clientMetadata,
      triggerSource: "DefineAuthChallenge_Authentication",
      userAttributes: attributesToRecord(userAttributes),
      username,
      userPoolId,
      session,
      userNotFound,
    });
