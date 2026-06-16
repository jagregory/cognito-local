import type {
  ListIdentityProvidersRequest,
  ListIdentityProvidersResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import { paginate } from "../services/pagination";
import type { Target } from "./Target";

export type ListIdentityProvidersTarget = Target<
  ListIdentityProvidersRequest,
  ListIdentityProvidersResponse
>;

type ListIdentityProvidersServices = Pick<Services, "cognito">;

export const ListIdentityProviders =
  ({
    cognito,
  }: ListIdentityProvidersServices): ListIdentityProvidersTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const providers: any[] =
      (userPool.options as any)._identityProviders ?? [];

    const { items, nextToken } = paginate(
      providers,
      req.MaxResults,
      req.NextToken,
    );

    return {
      Providers: items,
      NextToken: nextToken,
    };
  };
