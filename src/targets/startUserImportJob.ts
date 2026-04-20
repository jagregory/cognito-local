import type {
  StartUserImportJobRequest,
  StartUserImportJobResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { ResourceNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type StartUserImportJobTarget = Target<
  StartUserImportJobRequest,
  StartUserImportJobResponse
>;

export const StartUserImportJob =
  ({
    cognito,
    clock,
  }: Pick<Services, "cognito" | "clock">): StartUserImportJobTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const jobs =
      ((userPool.options as any)._importJobs as any[]) ?? [];
    const idx = jobs.findIndex((j: any) => j.JobId === req.JobId);
    if (idx < 0) {
      throw new ResourceNotFoundError("User import job not found");
    }

    const now = clock.get();
    jobs[idx] = {
      ...jobs[idx],
      Status: "Succeeded",
      StartDate: now,
      CompletionDate: now,
    };

    await userPool.updateOptions(ctx, {
      ...userPool.options,
      _importJobs: jobs,
    } as any);

    return { UserImportJob: jobs[idx] };
  };
