import type {
  CreateUserImportJobRequest,
  CreateUserImportJobResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import * as uuid from "uuid";
import type { Services } from "../services";
import type { Target } from "./Target";

export type CreateUserImportJobTarget = Target<
  CreateUserImportJobRequest,
  CreateUserImportJobResponse
>;

export const CreateUserImportJob =
  ({
    cognito,
    clock,
  }: Pick<Services, "cognito" | "clock">): CreateUserImportJobTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const now = clock.get();

    const job = {
      JobName: req.JobName,
      JobId: uuid.v4(),
      UserPoolId: req.UserPoolId,
      PreSignedUrl: `https://cognito-local.example.com/import/${uuid.v4()}`,
      CreationDate: now,
      Status: "Created" as const,
      CloudWatchLogsRoleArn: req.CloudWatchLogsRoleArn,
      ImportedUsers: 0,
      SkippedUsers: 0,
      FailedUsers: 0,
    };

    const jobs =
      ((userPool.options as any)._importJobs as any[]) ?? [];
    jobs.push(job);

    await userPool.updateOptions(ctx, {
      ...userPool.options,
      _importJobs: jobs,
    } as any);

    return { UserImportJob: job };
  };
