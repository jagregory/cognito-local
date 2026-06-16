import type {
  DescribeUserImportJobRequest,
  DescribeUserImportJobResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { ResourceNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type DescribeUserImportJobTarget = Target<
  DescribeUserImportJobRequest,
  DescribeUserImportJobResponse
>;

export const DescribeUserImportJob =
  ({ cognito }: Pick<Services, "cognito">): DescribeUserImportJobTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const jobs =
      ((userPool.options as any)._importJobs as any[]) ?? [];
    const job = jobs.find((j: any) => j.JobId === req.JobId);
    if (!job) {
      throw new ResourceNotFoundError("User import job not found");
    }

    return { UserImportJob: job };
  };
