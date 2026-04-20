import type {
  SetUICustomizationRequest,
  SetUICustomizationResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import type { Target } from "./Target";

export type SetUICustomizationTarget = Target<
  SetUICustomizationRequest,
  SetUICustomizationResponse
>;

export const SetUICustomization =
  ({
    cognito,
    clock,
  }: Pick<Services, "cognito" | "clock">): SetUICustomizationTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);

    const customization = {
      UserPoolId: req.UserPoolId,
      ClientId: req.ClientId ?? "ALL",
      CSS: req.CSS,
      CSSVersion: "1",
      LastModifiedDate: clock.get(),
      CreationDate: clock.get(),
    };

    await userPool.updateOptions(ctx, {
      ...userPool.options,
      _uiCustomization: customization,
    } as any);

    return { UICustomization: customization };
  };
