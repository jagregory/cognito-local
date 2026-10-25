import type {
  SetUserMFAPreferenceRequest,
  SetUserMFAPreferenceResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { InvalidParameterError, NotAuthorizedError } from "../errors";
import type { Services } from "../services";
import type { Token } from "../services/tokenGenerator";
import { withMfaPreference } from "./mfaPreference";
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

    await userPool.saveUser(
      ctx,
      withMfaPreference(user, req.SMSMfaSettings, req.SoftwareTokenMfaSettings),
    );

    return {};
  };
