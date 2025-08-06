import type {
  GetUserPoolMfaConfigRequest,
  GetUserPoolMfaConfigResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import type { Target } from "./Target";

export type GetUserPoolMfaConfigTarget = Target<
  GetUserPoolMfaConfigRequest,
  GetUserPoolMfaConfigResponse
>;

type GetUserPoolMfaConfigServices = Pick<Services, "cognito">;

export const GetUserPoolMfaConfig =
  ({ cognito }: GetUserPoolMfaConfigServices): GetUserPoolMfaConfigTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);

    return {
      MfaConfiguration: userPool.options.MfaConfiguration,
      SmsMfaConfiguration: {
        SmsAuthenticationMessage: userPool.options.SmsAuthenticationMessage,
        SmsConfiguration: userPool.options.SmsConfiguration,
      },
      SoftwareTokenMfaConfiguration: {
        Enabled: false,
      },
    };
  };
