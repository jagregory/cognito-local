import type {
  ListTagsForResourceRequest,
  ListTagsForResourceResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import type { Target } from "./Target";

export type ListTagsForResourceTarget = Target<
  ListTagsForResourceRequest,
  ListTagsForResourceResponse
>;

type ListTagsForResourceServices = Pick<Services, "cognito">;

export const ListTagsForResource =
  ({ cognito }: ListTagsForResourceServices): ListTagsForResourceTarget =>
  async (ctx, req) => {
    const poolId = req.ResourceArn.split("/").pop() ?? req.ResourceArn;
    const userPool = await cognito.getUserPool(ctx, poolId);

    const tags: Record<string, string> =
      (userPool.options as any)._tags ?? {};

    return {
      Tags: tags,
    };
  };
