import type {
  GetIdentityProviderByIdentifierRequest,
  GetIdentityProviderByIdentifierResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { ResourceNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type GetIdentityProviderByIdentifierTarget = Target<
  GetIdentityProviderByIdentifierRequest,
  GetIdentityProviderByIdentifierResponse
>;

type GetIdentityProviderByIdentifierServices = Pick<Services, "cognito">;

export const GetIdentityProviderByIdentifier =
  ({
    cognito,
  }: GetIdentityProviderByIdentifierServices): GetIdentityProviderByIdentifierTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const providers: any[] =
      (userPool.options as any)._identityProviders ?? [];

    const provider = providers.find(
      (p) =>
        p.IdpIdentifiers &&
        p.IdpIdentifiers.includes(req.IdpIdentifier),
    );
    if (!provider) {
      throw new ResourceNotFoundError("Identity provider not found.");
    }

    return {
      IdentityProvider: provider,
    };
  };
