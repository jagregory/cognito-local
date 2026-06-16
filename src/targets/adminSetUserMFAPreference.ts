import type {
  AdminSetUserMFAPreferenceRequest,
  AdminSetUserMFAPreferenceResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { UserNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type AdminSetUserMFAPreferenceTarget = Target<
  AdminSetUserMFAPreferenceRequest,
  AdminSetUserMFAPreferenceResponse
>;

type AdminSetUserMFAPreferenceServices = Pick<Services, "cognito" | "clock">;

export const AdminSetUserMFAPreference =
  ({
    cognito,
    clock,
  }: AdminSetUserMFAPreferenceServices): AdminSetUserMFAPreferenceTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const user = await userPool.getUserByUsername(ctx, req.Username);
    if (!user) {
      throw new UserNotFoundError();
    }

    const mfaSettingList: string[] = [];
    let preferredMfaSetting: string | undefined;

    if (req.SMSMfaSettings?.Enabled) {
      mfaSettingList.push("SMS_MFA");
      if (req.SMSMfaSettings.PreferredMfa) {
        preferredMfaSetting = "SMS_MFA";
      }
    }

    if (req.SoftwareTokenMfaSettings?.Enabled) {
      mfaSettingList.push("SOFTWARE_TOKEN_MFA");
      if (req.SoftwareTokenMfaSettings.PreferredMfa) {
        preferredMfaSetting = "SOFTWARE_TOKEN_MFA";
      }
    }

    await userPool.saveUser(ctx, {
      ...user,
      UserMFASettingList: mfaSettingList,
      PreferredMfaSetting: preferredMfaSetting,
      UserLastModifiedDate: clock.get(),
    });

    return {};
  };
