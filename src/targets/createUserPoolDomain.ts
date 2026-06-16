import type {
  CreateUserPoolDomainRequest,
  CreateUserPoolDomainResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import type { Target } from "./Target";

export type CreateUserPoolDomainTarget = Target<
  CreateUserPoolDomainRequest,
  CreateUserPoolDomainResponse
>;

type CreateUserPoolDomainServices = Pick<Services, "cognito">;

export const CreateUserPoolDomain =
  ({ cognito }: CreateUserPoolDomainServices): CreateUserPoolDomainTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);

    await userPool.updateOptions(ctx, {
      ...userPool.options,
      Domain: req.Domain,
      CustomDomain: req.CustomDomainConfig?.CertificateArn
        ? req.Domain
        : undefined,
    });

    return {
      CloudFrontDomain: req.Domain,
    };
  };
