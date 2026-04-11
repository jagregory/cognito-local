import type {
  SetUserMFAPreferenceRequest,
  SetUserMFAPreferenceResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Token } from "../services/tokenGenerator";
import type { Target } from "./Target";

export type SetUserMFAPreferenceTarget = Target<
  SetUserMFAPreferenceRequest,
  SetUserMFAPreferenceResponse
>;

type SetUserMFAPreferenceServices = Pick<Services, "cognito" | "clock">;

export const SetUserMFAPreference =
  ({
    cognito,
    clock,
  }: SetUserMFAPreferenceServices): SetUserMFAPreferenceTarget =>
  async (ctx, req) => {
    const decodedToken = jwt.decode(req.AccessToken) as Token | null;
    if (!decodedToken) {
      throw new InvalidParameterError();
    }

    const userPool = await cognito.getUserPoolForClientId(
      ctx,
      decodedToken.client_id,
    );
    const user = await userPool.getUserByUsername(ctx, decodedToken.sub);
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
