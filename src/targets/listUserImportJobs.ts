import type {
  ListUserImportJobsRequest,
  ListUserImportJobsResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import { paginate } from "../services/pagination";
import type { Target } from "./Target";

export type ListUserImportJobsTarget = Target<
  ListUserImportJobsRequest,
  ListUserImportJobsResponse
>;

export const ListUserImportJobs =
  ({ cognito }: Pick<Services, "cognito">): ListUserImportJobsTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const jobs =
      ((userPool.options as any)._importJobs as any[]) ?? [];

    const { items, nextToken } = paginate(
      jobs,
      req.MaxResults,
      req.PaginationToken,
    );

    return {
      UserImportJobs: items,
      PaginationToken: nextToken,
    };
  };
