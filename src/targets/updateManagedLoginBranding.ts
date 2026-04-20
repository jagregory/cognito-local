import { ResourceNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

interface UpdateManagedLoginBrandingRequest {
  UserPoolId: string;
  ManagedLoginBrandingId: string;
  Settings?: any;
  Assets?: any[];
}
interface UpdateManagedLoginBrandingResponse {
  ManagedLoginBranding?: any;
}

export type UpdateManagedLoginBrandingTarget = Target<
  UpdateManagedLoginBrandingRequest,
  UpdateManagedLoginBrandingResponse
>;

export const UpdateManagedLoginBranding =
  ({
    cognito,
    clock,
  }: Pick<Services, "cognito" | "clock">): UpdateManagedLoginBrandingTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const items =
      ((userPool.options as any)._managedLoginBranding as any[]) ?? [];
    const idx = items.findIndex(
      (b: any) =>
        b.ManagedLoginBrandingId === req.ManagedLoginBrandingId,
    );
    if (idx < 0) {
      throw new ResourceNotFoundError("Managed login branding not found");
    }

    items[idx] = {
      ...items[idx],
      Settings: req.Settings ?? items[idx].Settings,
      Assets: req.Assets ?? items[idx].Assets,
      LastModifiedDate: clock.get(),
    };

    await userPool.updateOptions(ctx, {
      ...userPool.options,
      _managedLoginBranding: items,
    } as any);

    return { ManagedLoginBranding: items[idx] };
  };
