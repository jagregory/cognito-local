import type {
  CreateIdentityProviderRequest,
  CreateIdentityProviderResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import type { Target } from "./Target";

export type CreateIdentityProviderTarget = Target<
  CreateIdentityProviderRequest,
  CreateIdentityProviderResponse
>;

interface IdentityProviderData {
  UserPoolId: string;
  ProviderName: string;
  ProviderType: string;
  ProviderDetails: Record<string, string>;
  AttributeMapping?: Record<string, string>;
  IdpIdentifiers?: string[];
  CreationDate: Date;
  LastModifiedDate: Date;
}

type CreateIdentityProviderServices = Pick<Services, "cognito" | "clock">;

export const CreateIdentityProvider =
  ({
    cognito,
    clock,
  }: CreateIdentityProviderServices): CreateIdentityProviderTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const now = clock.get();

    const provider: IdentityProviderData = {
      UserPoolId: req.UserPoolId,
      ProviderName: req.ProviderName,
      ProviderType: req.ProviderType,
      ProviderDetails: req.ProviderDetails,
      AttributeMapping: req.AttributeMapping,
      IdpIdentifiers: req.IdpIdentifiers,
      CreationDate: now,
      LastModifiedDate: now,
    };

    const providers: IdentityProviderData[] =
      (userPool.options as any)._identityProviders ?? [];
    providers.push(provider);

    await userPool.updateOptions(ctx, {
      ...userPool.options,
      _identityProviders: providers,
    } as any);

    return {
      IdentityProvider: provider as any,
    };
  };
