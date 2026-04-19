import type {
  VerifySoftwareTokenRequest,
  VerifySoftwareTokenResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import {
  CodeMismatchError,
  InvalidParameterError,
  NotAuthorizedError,
} from "../errors";
import type { Services } from "../services";
import type { Token } from "../services/tokenGenerator";
import { verify } from "../services/totp";
import type { Target } from "./Target";

export type VerifySoftwareTokenTarget = Target<
  VerifySoftwareTokenRequest,
  VerifySoftwareTokenResponse
>;

type VerifySoftwareTokenServices = Pick<Services, "cognito">;

export const VerifySoftwareToken =
  ({ cognito }: VerifySoftwareTokenServices): VerifySoftwareTokenTarget =>
  async (ctx, req) => {
    if (!req.UserCode) {
      throw new InvalidParameterError("Missing required parameter UserCode");
    }
    if (!req.AccessToken && !req.Session) {
      throw new InvalidParameterError(
        "Either AccessToken or Session is required",
      );
    }
    if (!req.AccessToken) {
      throw new InvalidParameterError(
        "VerifySoftwareToken via Session (MFA_SETUP flow) is not supported; call with AccessToken",
      );
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

    const secret = user.SoftwareTokenMfaConfiguration?.Secret;
    if (!secret) {
      throw new InvalidParameterError(
        "User has not associated a software token",
      );
    }

    if (!verify(secret, req.UserCode)) {
      throw new CodeMismatchError();
    }

    const existingMethods = user.UserMFASettingList ?? [];
    const UserMFASettingList = existingMethods.includes("SOFTWARE_TOKEN_MFA")
      ? existingMethods
      : [...existingMethods, "SOFTWARE_TOKEN_MFA"];

    await userPool.saveUser(ctx, {
      ...user,
      SoftwareTokenMfaConfiguration: {
        Secret: secret,
        Verified: true,
        FriendlyDeviceName:
          req.FriendlyDeviceName ??
          user.SoftwareTokenMfaConfiguration?.FriendlyDeviceName,
      },
      UserMFASettingList,
    });

    return {
      Status: "SUCCESS",
      Session: req.Session,
    };
  };
