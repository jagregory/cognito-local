import type {
  AdminSetUserMFAPreferenceRequest,
  AdminSetUserMFAPreferenceResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { UserNotFoundError } from "../errors";
import type { Services } from "../services";
import { withMfaPreference } from "./mfaPreference";
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

    await userPool.saveUser(ctx, {
      ...withMfaPreference(
        user,
        req.SMSMfaSettings,
        req.SoftwareTokenMfaSettings,
      ),
      UserLastModifiedDate: clock.get(),
    });

    return {};
  };
