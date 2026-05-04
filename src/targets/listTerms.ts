import type { Services } from "../services";
import { paginate } from "../services/pagination";
import type { Target } from "./Target";

interface ListTermsRequest {
  UserPoolId: string;
  NextToken?: string;
  MaxResults?: number;
}
interface ListTermsResponse {
  Terms?: any[];
  NextToken?: string;
}

export type ListTermsTarget = Target<ListTermsRequest, ListTermsResponse>;

export const ListTerms =
  ({ cognito }: Pick<Services, "cognito">): ListTermsTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const items = ((userPool.options as any)._terms as any[]) ?? [];

    const { items: page, nextToken } = paginate(
      items,
      req.MaxResults,
      req.NextToken,
    );

    return {
      Terms: page,
      NextToken: nextToken,
    };
  };
