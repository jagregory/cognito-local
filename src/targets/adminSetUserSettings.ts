import type {
  AdminSetUserSettingsRequest,
  AdminSetUserSettingsResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { UserNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type AdminSetUserSettingsTarget = Target<
  AdminSetUserSettingsRequest,
  AdminSetUserSettingsResponse
>;

type AdminSetUserSettingsServices = Pick<Services, "cognito" | "clock">;

export const AdminSetUserSettings =
  ({
    cognito,
    clock,
  }: AdminSetUserSettingsServices): AdminSetUserSettingsTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const user = await userPool.getUserByUsername(ctx, req.Username);
    if (!user) {
      throw new UserNotFoundError();
    }

    const mfaSettingList: string[] = [];

    if (req.MFAOptions) {
      for (const opt of req.MFAOptions) {
        if (opt.DeliveryMedium === "SMS") {
          mfaSettingList.push("SMS_MFA");
        }
      }
    }

    await userPool.saveUser(ctx, {
      ...user,
      MFAOptions: req.MFAOptions as any,
      UserMFASettingList: mfaSettingList,
      UserLastModifiedDate: clock.get(),
    });

    return {};
  };
