import { ResourceNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

interface DescribeManagedLoginBrandingRequest {
  UserPoolId: string;
  ManagedLoginBrandingId: string;
}
interface DescribeManagedLoginBrandingResponse {
  ManagedLoginBranding?: any;
}

export type DescribeManagedLoginBrandingTarget = Target<
  DescribeManagedLoginBrandingRequest,
  DescribeManagedLoginBrandingResponse
>;

export const DescribeManagedLoginBranding =
  ({
    cognito,
  }: Pick<Services, "cognito">): DescribeManagedLoginBrandingTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const items =
      ((userPool.options as any)._managedLoginBranding as any[]) ?? [];
    const branding = items.find(
      (b: any) =>
        b.ManagedLoginBrandingId === req.ManagedLoginBrandingId,
    );
    if (!branding) {
      throw new ResourceNotFoundError("Managed login branding not found");
    }
    return { ManagedLoginBranding: branding };
  };
