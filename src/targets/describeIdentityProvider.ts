import type {
  DescribeIdentityProviderRequest,
  DescribeIdentityProviderResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { ResourceNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type DescribeIdentityProviderTarget = Target<
  DescribeIdentityProviderRequest,
  DescribeIdentityProviderResponse
>;

type DescribeIdentityProviderServices = Pick<Services, "cognito">;

export const DescribeIdentityProvider =
  ({
    cognito,
  }: DescribeIdentityProviderServices): DescribeIdentityProviderTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const providers: any[] =
      (userPool.options as any)._identityProviders ?? [];

    const provider = providers.find(
      (p) => p.ProviderName === req.ProviderName,
    );
    if (!provider) {
      throw new ResourceNotFoundError("Identity provider not found.");
    }

    return {
      IdentityProvider: provider,
    };
  };
