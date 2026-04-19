import type {
  SetUserMFAPreferenceRequest,
  SetUserMFAPreferenceResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { InvalidParameterError, NotAuthorizedError } from "../errors";
import type { Services } from "../services";
import type { Token } from "../services/tokenGenerator";
import type { Target } from "./Target";

export type SetUserMFAPreferenceTarget = Target<
  SetUserMFAPreferenceRequest,
  SetUserMFAPreferenceResponse
>;

type SetUserMFAPreferenceServices = Pick<Services, "cognito">;

export const SetUserMFAPreference =
  ({ cognito }: SetUserMFAPreferenceServices): SetUserMFAPreferenceTarget =>
  async (ctx, req) => {
    if (!req.AccessToken) {
      throw new InvalidParameterError("Missing required parameter AccessToken");
    }

    const decoded = jwt.decode(req.AccessToken) as Token | null;
    if (!decoded) {
      throw new InvalidParameterError();
    }

    const userPool = await cognito.getUserPoolForClientId(
      ctx,
      decoded.client_id,
    );
    const user = await userPool.getUserByUsername(ctx, decoded.sub);
    if (!user) {
      throw new NotAuthorizedError();
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
