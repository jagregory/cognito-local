import type {
  AdminRespondToAuthChallengeRequest,
  AdminRespondToAuthChallengeResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { v4 } from "uuid";
import {
  CodeMismatchError,
  InvalidParameterError,
  InvalidPasswordError,
  NotAuthorizedError,
  UnsupportedError,
} from "../errors";
import type { Services } from "../services";
import { verify as verifyTotp } from "../services/totp";
import type { Target } from "./Target";

export type AdminRespondToAuthChallengeTarget = Target<
  AdminRespondToAuthChallengeRequest,
  AdminRespondToAuthChallengeResponse
>;

type AdminRespondToAuthChallengeServices = Pick<
  Services,
  "clock" | "cognito" | "triggers" | "tokenGenerator"
>;

export const AdminRespondToAuthChallenge =
  ({
    clock,
    cognito,
    triggers,
    tokenGenerator,
  }: AdminRespondToAuthChallengeServices): AdminRespondToAuthChallengeTarget =>
  async (ctx, req) => {
    if (!req.ChallengeResponses) {
      throw new InvalidParameterError(
        "Missing required parameter challenge responses",
      );
    }
    if (!req.ChallengeResponses.USERNAME) {
      throw new InvalidParameterError("Missing required parameter USERNAME");
    }
    if (!req.Session) {
      throw new InvalidParameterError("Missing required parameter Session");
    }

    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const userPoolClient = await cognito.getAppClient(ctx, req.ClientId);

    const user = await userPool.getUserByUsername(
      ctx,
      req.ChallengeResponses.USERNAME,
    );
    if (!user || !userPoolClient) {
      throw new NotAuthorizedError();
    }

    if (req.ChallengeName === "SMS_MFA") {
      if (user.MFACode !== req.ChallengeResponses.SMS_MFA_CODE) {
        throw new CodeMismatchError();
      }

      await userPool.saveUser(ctx, {
        ...user,
        MFACode: undefined,
        UserLastModifiedDate: clock.get(),
      });
    } else if (req.ChallengeName === "SOFTWARE_TOKEN_MFA") {
      const code = req.ChallengeResponses.SOFTWARE_TOKEN_MFA_CODE;
      const secret = user.SoftwareTokenMfaConfiguration?.Secret;
      if (
        !code ||
        !secret ||
        !user.SoftwareTokenMfaConfiguration?.Verified ||
        !verifyTotp(secret, code)
      ) {
        throw new CodeMismatchError();
      }
      await userPool.saveUser(ctx, {
        ...user,
        UserLastModifiedDate: clock.get(),
      });
    } else if (req.ChallengeName === "NEW_PASSWORD_REQUIRED") {
      if (!req.ChallengeResponses.NEW_PASSWORD) {
        throw new InvalidParameterError(
          "Missing required parameter NEW_PASSWORD",
        );
      }

      await userPool.saveUser(ctx, {
        ...user,
        Password: req.ChallengeResponses.NEW_PASSWORD,
        UserLastModifiedDate: clock.get(),
        UserStatus: "CONFIRMED",
      });
    } else if (req.ChallengeName === "PASSWORD_VERIFIER") {
      if (user.Password === undefined) {
        throw new InvalidPasswordError();
      }
      if (
        (userPool.options.MfaConfiguration === "OPTIONAL" &&
          ((user.MFAOptions ?? []).length > 0 ||
            (user.UserMFASettingList ?? []).length > 0)) ||
        userPool.options.MfaConfiguration === "ON"
      ) {
        return {
          ChallengeName:
            user.PreferredMfaSetting === "SOFTWARE_TOKEN_MFA"
              ? "SOFTWARE_TOKEN_MFA"
              : "SMS_MFA",
          ChallengeParameters: {
            USER_ID_FOR_SRP: user.Username,
          } as AdminRespondToAuthChallengeResponse["ChallengeParameters"],
          Session: v4(),
        };
      }
      if (user.UserStatus === "FORCE_CHANGE_PASSWORD") {
        return {
          ChallengeName: "NEW_PASSWORD_REQUIRED",
          ChallengeParameters: {
            USER_ID_FOR_SRP: user.Username,
            requiredAttributes: JSON.stringify([]),
          } as AdminRespondToAuthChallengeResponse["ChallengeParameters"],
          Session: v4(),
        };
      }
    } else if (req.ChallengeName === "MFA_SETUP") {
      if (!req.ChallengeResponses.SOFTWARE_TOKEN_MFA_CODE) {
        throw new InvalidParameterError(
          "Missing required parameter SOFTWARE_TOKEN_MFA_CODE",
        );
      }
      const mfaSettingList = user.UserMFASettingList ?? [];
      if (!mfaSettingList.includes("SOFTWARE_TOKEN_MFA")) {
        mfaSettingList.push("SOFTWARE_TOKEN_MFA");
      }
      await userPool.saveUser(ctx, {
        ...user,
        UserMFASettingList: mfaSettingList,
        PreferredMfaSetting: "SOFTWARE_TOKEN_MFA",
        UserLastModifiedDate: clock.get(),
      });
    } else if (req.ChallengeName === "CUSTOM_CHALLENGE") {
      if (!triggers.enabled("VerifyAuthChallengeResponse")) {
        throw new UnsupportedError(
          "CUSTOM_CHALLENGE requires VerifyAuthChallengeResponse trigger",
        );
      }

      const verifyResult = await triggers.verifyAuthChallengeResponse(ctx, {
        clientId: req.ClientId,
        userAttributes: user.Attributes,
        username: user.Username,
        userPoolId: req.UserPoolId,
        challengeAnswer: req.ChallengeResponses.ANSWER ?? "",
        clientMetadata: req.ClientMetadata,
      });

      if (!verifyResult.answerCorrect) {
        throw new CodeMismatchError();
      }
    } else {
      throw new UnsupportedError(
        `adminRespondToAuthChallenge with ChallengeName=${req.ChallengeName}`,
      );
    }

    if (triggers.enabled("PostAuthentication")) {
      await triggers.postAuthentication(ctx, {
        clientId: req.ClientId,
        clientMetadata: req.ClientMetadata,
        source: "PostAuthentication_Authentication",
        userAttributes: user.Attributes,
        username: user.Username,
        userPoolId: req.UserPoolId,
      });
    }

    const userGroups = await userPool.listUserGroupMembership(ctx, user);

    return {
      ChallengeParameters: {},
      AuthenticationResult: await tokenGenerator.generate(
        ctx,
        user,
        userGroups,
        userPoolClient,
        req.ClientMetadata,
        "Authentication",
      ),
    };
  };
