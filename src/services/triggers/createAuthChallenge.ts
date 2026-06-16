import type { CreateAuthChallengeTriggerEvent } from "aws-lambda";
import type { AttributeListType } from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Lambda } from "../lambda";
import { attributesToRecord } from "../userPoolService";
import type { Trigger } from "./trigger";

export type CreateAuthChallengeTriggerResponse =
  CreateAuthChallengeTriggerEvent["response"];

export type CreateAuthChallengeTrigger = Trigger<
  {
    clientId: string;
    userAttributes: AttributeListType;
    username: string;
    userPoolId: string;
    challengeName: string;
    session: Array<{
      challengeName: string;
      challengeResult: boolean;
      challengeMetadata?: string;
    }>;
    clientMetadata?: Record<string, string>;
  },
  CreateAuthChallengeTriggerResponse
>;

type CreateAuthChallengeServices = {
  lambda: Lambda;
};

export const CreateAuthChallenge =
  ({ lambda }: CreateAuthChallengeServices): CreateAuthChallengeTrigger =>
  async (
    ctx,
    {
      clientId,
      userAttributes,
      username,
      userPoolId,
      challengeName,
      session,
      clientMetadata,
    },
  ) =>
    lambda.invoke(ctx, "CreateAuthChallenge", {
      clientId,
      clientMetadata,
      triggerSource: "CreateAuthChallenge_Authentication",
      userAttributes: attributesToRecord(userAttributes),
      username,
      userPoolId,
      challengeName,
      session,
    });
