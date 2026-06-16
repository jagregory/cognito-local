import { ResourceNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

interface DeleteManagedLoginBrandingRequest {
  UserPoolId: string;
  ManagedLoginBrandingId: string;
}
interface DeleteManagedLoginBrandingResponse {}

export type DeleteManagedLoginBrandingTarget = Target<
  DeleteManagedLoginBrandingRequest,
  DeleteManagedLoginBrandingResponse
>;

export const DeleteManagedLoginBranding =
  ({ cognito }: Pick<Services, "cognito">): DeleteManagedLoginBrandingTarget =>
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

    items.splice(idx, 1);

    await userPool.updateOptions(ctx, {
      ...userPool.options,
      _managedLoginBranding: items,
    } as any);

    return {};
  };
