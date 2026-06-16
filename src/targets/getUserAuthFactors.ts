import jwt from "jsonwebtoken";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Token } from "../services/tokenGenerator";
import type { Target } from "./Target";

interface GetUserAuthFactorsRequest {
  AccessToken: string;
}

interface GetUserAuthFactorsResponse {
  Username?: string;
  PreferredMfaSetting?: string;
  UserMFASettingList?: string[];
  ConfiguredUserAuthFactors?: string[];
}

export type GetUserAuthFactorsTarget = Target<
  GetUserAuthFactorsRequest,
  GetUserAuthFactorsResponse
>;

type GetUserAuthFactorsServices = Pick<Services, "cognito">;

export const GetUserAuthFactors =
  ({ cognito }: GetUserAuthFactorsServices): GetUserAuthFactorsTarget =>
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

    const factors: string[] = ["PASSWORD"];
    if (user.UserMFASettingList) {
      for (const mfa of user.UserMFASettingList) {
        if (mfa === "SMS_MFA") factors.push("SMS");
        if (mfa === "SOFTWARE_TOKEN_MFA") factors.push("TOTP");
      }
    }

    return {
      Username: user.Username,
      PreferredMfaSetting: user.PreferredMfaSetting,
      UserMFASettingList: user.UserMFASettingList,
      ConfiguredUserAuthFactors: factors,
    };
  };
