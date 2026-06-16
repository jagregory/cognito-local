import * as uuid from "uuid";
import type { Services } from "../services";
import type { Target } from "./Target";

interface CreateManagedLoginBrandingRequest {
  UserPoolId: string;
  ClientId?: string;
  Settings?: any;
  Assets?: any[];
}
interface CreateManagedLoginBrandingResponse {
  ManagedLoginBranding?: any;
}

export type CreateManagedLoginBrandingTarget = Target<
  CreateManagedLoginBrandingRequest,
  CreateManagedLoginBrandingResponse
>;

export const CreateManagedLoginBranding =
  ({
    cognito,
    clock,
  }: Pick<Services, "cognito" | "clock">): CreateManagedLoginBrandingTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const now = clock.get();

    const branding = {
      ManagedLoginBrandingId: uuid.v4(),
      UserPoolId: req.UserPoolId,
      ClientId: req.ClientId,
      Settings: req.Settings,
      Assets: req.Assets,
      CreationDate: now,
      LastModifiedDate: now,
    };

    const existing =
      ((userPool.options as any)._managedLoginBranding as any[]) ?? [];
    existing.push(branding);

    await userPool.updateOptions(ctx, {
      ...userPool.options,
      _managedLoginBranding: existing,
    } as any);

    return { ManagedLoginBranding: branding };
  };
