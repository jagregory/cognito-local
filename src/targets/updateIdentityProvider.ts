import type {
  UpdateIdentityProviderRequest,
  UpdateIdentityProviderResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { ResourceNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type UpdateIdentityProviderTarget = Target<
  UpdateIdentityProviderRequest,
  UpdateIdentityProviderResponse
>;

type UpdateIdentityProviderServices = Pick<Services, "cognito" | "clock">;

export const UpdateIdentityProvider =
  ({
    cognito,
    clock,
  }: UpdateIdentityProviderServices): UpdateIdentityProviderTarget =>
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

    const updated = {
      ...providers[index],
      ...(req.ProviderDetails && { ProviderDetails: req.ProviderDetails }),
      ...(req.AttributeMapping && { AttributeMapping: req.AttributeMapping }),
      ...(req.IdpIdentifiers && { IdpIdentifiers: req.IdpIdentifiers }),
      LastModifiedDate: clock.get(),
    };

    providers[index] = updated;

    await userPool.updateOptions(ctx, {
      ...userPool.options,
      _identityProviders: providers,
    } as any);

    return {
      IdentityProvider: updated,
    };
  };
