import type {
  TagResourceRequest,
  TagResourceResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import type { Target } from "./Target";

export type TagResourceTarget = Target<TagResourceRequest, TagResourceResponse>;

type TagResourceServices = Pick<Services, "cognito">;

export const TagResource =
  ({ cognito }: TagResourceServices): TagResourceTarget =>
  async (ctx, req) => {
    // ResourceArn format: arn:aws:cognito-idp:<region>:<account>:userpool/<poolId>
    const poolId = req.ResourceArn.split("/").pop() ?? req.ResourceArn;
    const userPool = await cognito.getUserPool(ctx, poolId);

    const tags: Record<string, string> =
      (userPool.options as any)._tags ?? {};

    if (req.Tags) {
      for (const [key, value] of Object.entries(req.Tags)) {
        tags[key] = value;
      }
    }

    await userPool.updateOptions(ctx, {
      ...userPool.options,
      _tags: tags,
    } as any);

    return {};
  };
