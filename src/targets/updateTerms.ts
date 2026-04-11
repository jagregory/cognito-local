import { ResourceNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

interface UpdateTermsRequest {
  UserPoolId: string;
  TermsId: string;
  TermsText?: string;
}
interface UpdateTermsResponse {
  Terms?: any;
}

export type UpdateTermsTarget = Target<
  UpdateTermsRequest,
  UpdateTermsResponse
>;

export const UpdateTerms =
  ({
    cognito,
    clock,
  }: Pick<Services, "cognito" | "clock">): UpdateTermsTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const items = ((userPool.options as any)._terms as any[]) ?? [];
    const idx = items.findIndex((t: any) => t.TermsId === req.TermsId);
    if (idx < 0) {
      throw new ResourceNotFoundError("Terms not found");
    }

    items[idx] = {
      ...items[idx],
      TermsText: req.TermsText ?? items[idx].TermsText,
      LastModifiedDate: clock.get(),
    };

    await userPool.updateOptions(ctx, {
      ...userPool.options,
      _terms: items,
    } as any);

    return { Terms: items[idx] };
  };
