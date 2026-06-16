import type {
  SetUserSettingsRequest,
  SetUserSettingsResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Token } from "../services/tokenGenerator";
import type { Target } from "./Target";

export type SetUserSettingsTarget = Target<
  SetUserSettingsRequest,
  SetUserSettingsResponse
>;

type SetUserSettingsServices = Pick<Services, "cognito" | "clock">;

export const SetUserSettings =
  ({ cognito, clock }: SetUserSettingsServices): SetUserSettingsTarget =>
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
