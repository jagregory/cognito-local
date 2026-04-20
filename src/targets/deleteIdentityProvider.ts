import type { DeleteIdentityProviderRequest } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { ResourceNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type DeleteIdentityProviderTarget = Target<
  DeleteIdentityProviderRequest,
  {}
>;

type DeleteIdentityProviderServices = Pick<Services, "cognito">;

export const DeleteIdentityProvider =
  ({ cognito }: DeleteIdentityProviderServices): DeleteIdentityProviderTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const providers: any[] =
      (userPool.options as any)._identityProviders ?? [];

    const index = providers.findIndex(
      (p) => p.ProviderName === req.ProviderName,
    );
    if (index === -1) {
      throw new ResourceNotFoundError("Identity provider not found.");
    }

    providers.splice(index, 1);

    await userPool.updateOptions(ctx, {
      ...userPool.options,
      _identityProviders: providers,
    } as any);

    return {};
  };
