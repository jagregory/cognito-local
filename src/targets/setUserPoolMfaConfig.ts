import type {
  SetUserPoolMfaConfigRequest,
  SetUserPoolMfaConfigResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import type { Target } from "./Target";

export type SetUserPoolMfaConfigTarget = Target<
  SetUserPoolMfaConfigRequest,
  SetUserPoolMfaConfigResponse
>;

type SetUserPoolMfaConfigServices = Pick<Services, "cognito">;

export const SetUserPoolMfaConfig =
  ({ cognito }: SetUserPoolMfaConfigServices): SetUserPoolMfaConfigTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);

    await userPool.updateOptions(ctx, {
      ...userPool.options,
      MfaConfiguration: req.MfaConfiguration,
      SmsConfiguration: req.SmsMfaConfiguration?.SmsConfiguration,
      SmsAuthenticationMessage:
        req.SmsMfaConfiguration?.SmsAuthenticationMessage,
    });

    return {
      MfaConfiguration: req.MfaConfiguration,
      SmsMfaConfiguration: req.SmsMfaConfiguration,
      SoftwareTokenMfaConfiguration: req.SoftwareTokenMfaConfiguration,
    };
  };
