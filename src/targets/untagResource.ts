import type {
  UntagResourceRequest,
  UntagResourceResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import type { Target } from "./Target";

export type UntagResourceTarget = Target<
  UntagResourceRequest,
  UntagResourceResponse
>;

type UntagResourceServices = Pick<Services, "cognito">;

export const UntagResource =
  ({ cognito }: UntagResourceServices): UntagResourceTarget =>
  async (ctx, req) => {
    const poolId = req.ResourceArn.split("/").pop() ?? req.ResourceArn;
    const userPool = await cognito.getUserPool(ctx, poolId);

    const tags: Record<string, string> =
      (userPool.options as any)._tags ?? {};

    if (req.TagKeys) {
      for (const key of req.TagKeys) {
        delete tags[key];
      }
    }

    await userPool.updateOptions(ctx, {
      ...userPool.options,
      _tags: tags,
    } as any);

    return {};
  };
