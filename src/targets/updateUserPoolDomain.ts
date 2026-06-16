import type {
  UpdateUserPoolDomainRequest,
  UpdateUserPoolDomainResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import type { Target } from "./Target";

export type UpdateUserPoolDomainTarget = Target<
  UpdateUserPoolDomainRequest,
  UpdateUserPoolDomainResponse
>;

type UpdateUserPoolDomainServices = Pick<Services, "cognito">;

export const UpdateUserPoolDomain =
  ({ cognito }: UpdateUserPoolDomainServices): UpdateUserPoolDomainTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);

    await userPool.updateOptions(ctx, {
      ...userPool.options,
      Domain: req.Domain,
    });

    return {
      CloudFrontDomain: req.Domain,
    };
  };
