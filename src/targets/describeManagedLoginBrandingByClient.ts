import { ResourceNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

interface DescribeManagedLoginBrandingByClientRequest {
  UserPoolId: string;
  ClientId: string;
}
interface DescribeManagedLoginBrandingByClientResponse {
  ManagedLoginBranding?: any;
}

export type DescribeManagedLoginBrandingByClientTarget = Target<
  DescribeManagedLoginBrandingByClientRequest,
  DescribeManagedLoginBrandingByClientResponse
>;

export const DescribeManagedLoginBrandingByClient =
  ({
    cognito,
  }: Pick<
    Services,
    "cognito"
  >): DescribeManagedLoginBrandingByClientTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const items =
      ((userPool.options as any)._managedLoginBranding as any[]) ?? [];
    const branding = items.find(
      (b: any) => b.ClientId === req.ClientId,
    );
    if (!branding) {
      throw new ResourceNotFoundError("Managed login branding not found");
    }
    return { ManagedLoginBranding: branding };
  };
