import type {
  VerifySoftwareTokenRequest,
  VerifySoftwareTokenResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { TOTP } from "otpauth";
import * as uuid from "uuid";
import {
  CodeMismatchError,
  InvalidParameterError,
  UserNotFoundError,
} from "../errors";
import type { Services } from "../services";
import type { Token } from "../services/tokenGenerator";
import type { Target } from "./Target";

export type VerifySoftwareTokenTarget = Target<
  VerifySoftwareTokenRequest,
  VerifySoftwareTokenResponse
>;

type VerifySoftwareTokenServices = Pick<Services, "cognito" | "clock">;

export const VerifySoftwareToken =
  ({
    cognito,
    clock,
  }: VerifySoftwareTokenServices): VerifySoftwareTokenTarget =>
  async (ctx, req) => {
    if (!req.UserCode) {
      throw new InvalidParameterError("UserCode is required");
    }

    if (!req.AccessToken && !req.Session) {
      throw new InvalidParameterError("AccessToken or Session is required");
    }

    if (!req.AccessToken) {
      // Session-based flow — return success for emulator
      return {
        Status: "SUCCESS",
        Session: uuid.v4(),
      };
    }

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

    if (!user.TOTPSecret) {
      throw new InvalidParameterError(
        "Software token MFA has not been associated",
      );
    }

    // Verify the TOTP code
    const totp = new TOTP({
      secret: user.TOTPSecret,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });

    const delta = totp.validate({ token: req.UserCode, window: 1 });
    if (delta === null) {
      throw new CodeMismatchError();
    }

    // Mark TOTP as verified on the user
    const mfaSettingList = user.UserMFASettingList ?? [];
    if (!mfaSettingList.includes("SOFTWARE_TOKEN_MFA")) {
      mfaSettingList.push("SOFTWARE_TOKEN_MFA");
    }

    await userPool.saveUser(ctx, {
      ...user,
      UserMFASettingList: mfaSettingList,
      UserLastModifiedDate: clock.get(),
    });

    return {
      Status: "SUCCESS",
      Session: uuid.v4(),
    };
  };
