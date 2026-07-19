import type {
  AdminSetUserMFAPreferenceRequest,
  AdminSetUserMFAPreferenceResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type AdminSetUserMFAPreferenceTarget = Target<
  AdminSetUserMFAPreferenceRequest,
  AdminSetUserMFAPreferenceResponse
>;

type AdminSetUserMFAPreferenceServices = Pick<Services, "cognito">;

export const AdminSetUserMFAPreference =
  ({
    cognito,
  }: AdminSetUserMFAPreferenceServices): AdminSetUserMFAPreferenceTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const user = await userPool.getUserByUsername(ctx, req.Username);
    if (!user) {
      throw new UserNotFoundError("User does not exist.");
    }

    const sms = req.SMSMfaSettings;
    const software = req.SoftwareTokenMfaSettings;

    if (software?.Enabled && !user.SoftwareTokenMfaConfiguration?.Verified) {
      throw new InvalidParameterError(
        "User has not verified software token MFA",
      );
    }

    const methods = new Set(user.UserMFASettingList ?? []);
    if (sms) {
      if (sms.Enabled) methods.add("SMS_MFA");
      else methods.delete("SMS_MFA");
    }
    if (software) {
      if (software.Enabled) methods.add("SOFTWARE_TOKEN_MFA");
      else methods.delete("SOFTWARE_TOKEN_MFA");
    }

    const preferred = sms?.PreferredMfa
      ? "SMS_MFA"
      : software?.PreferredMfa
        ? "SOFTWARE_TOKEN_MFA"
        : undefined;

    if (preferred && !methods.has(preferred)) {
      throw new InvalidParameterError(
        `Cannot set ${preferred} as preferred — it is not enabled`,
      );
    }

    await userPool.saveUser(ctx, {
      ...user,
      UserMFASettingList: [...methods],
      PreferredMfaSetting: preferred,
    });

    return {};
  };
