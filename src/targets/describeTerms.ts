import { ResourceNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

interface DescribeTermsRequest {
  UserPoolId: string;
  TermsId: string;
}
interface DescribeTermsResponse {
  Terms?: any;
}

export type DescribeTermsTarget = Target<
  DescribeTermsRequest,
  DescribeTermsResponse
>;

export const DescribeTerms =
  ({ cognito }: Pick<Services, "cognito">): DescribeTermsTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const items = ((userPool.options as any)._terms as any[]) ?? [];
    const terms = items.find((t: any) => t.TermsId === req.TermsId);
    if (!terms) {
      throw new ResourceNotFoundError("Terms not found");
    }
    return { Terms: terms };
  };
