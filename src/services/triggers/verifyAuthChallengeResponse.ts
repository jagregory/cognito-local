import type { VerifyAuthChallengeResponseTriggerEvent } from "aws-lambda";
import type { AttributeListType } from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Lambda } from "../lambda";
import { attributesToRecord } from "../userPoolService";
import type { Trigger } from "./trigger";

export type VerifyAuthChallengeResponseTriggerResponse =
  VerifyAuthChallengeResponseTriggerEvent["response"];

export type VerifyAuthChallengeResponseTrigger = Trigger<
  {
    clientId: string;
    userAttributes: AttributeListType;
    username: string;
    userPoolId: string;
    challengeAnswer: string;
    privateChallengeParameters?: Record<string, string>;
    clientMetadata?: Record<string, string>;
  },
  VerifyAuthChallengeResponseTriggerResponse
>;

type VerifyAuthChallengeResponseServices = {
  lambda: Lambda;
};

export const VerifyAuthChallengeResponse =
  ({
    lambda,
  }: VerifyAuthChallengeResponseServices): VerifyAuthChallengeResponseTrigger =>
  async (
    ctx,
    {
      clientId,
      userAttributes,
      username,
      userPoolId,
      challengeAnswer,
      privateChallengeParameters,
      clientMetadata,
    },
  ) =>
    lambda.invoke(ctx, "VerifyAuthChallengeResponse", {
      clientId,
      clientMetadata,
      triggerSource: "VerifyAuthChallengeResponse_Authentication",
      userAttributes: attributesToRecord(userAttributes),
      username,
      userPoolId,
      challengeAnswer,
      privateChallengeParameters,
    });
