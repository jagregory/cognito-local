import type {
  RespondToAuthChallengeRequest,
  RespondToAuthChallengeResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import {
  CodeMismatchError,
  InvalidParameterError,
  NotAuthorizedError,
  UnsupportedError,
} from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type RespondToAuthChallengeTarget = Target<
  RespondToAuthChallengeRequest,
  RespondToAuthChallengeResponse
>;

type RespondToAuthChallengeService = Pick<
  Services,
  "clock" | "cognito" | "triggers" | "tokenGenerator"
>;

export const RespondToAuthChallenge =
  ({
    clock,
    cognito,
    triggers,
    tokenGenerator,
  }: RespondToAuthChallengeService): RespondToAuthChallengeTarget =>
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

    const userPool = await cognito.getUserPoolForClientId(ctx, req.ClientId);
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
    } else if (req.ChallengeName === "NEW_PASSWORD_REQUIRED") {
      if (!req.ChallengeResponses.NEW_PASSWORD) {
        throw new InvalidParameterError(
          "Missing required parameter NEW_PASSWORD",
        );
      }

      // TODO: validate the password?
      await userPool.saveUser(ctx, {
        ...user,
        Password: req.ChallengeResponses.NEW_PASSWORD,
        UserLastModifiedDate: clock.get(),
        UserStatus: "CONFIRMED",
      });
    } else {
      throw new UnsupportedError(
        `respondToAuthChallenge with ChallengeName=${req.ChallengeName}`,
      );
    }

    if (triggers.enabled("PostAuthentication")) {
      await triggers.postAuthentication(ctx, {
        clientId: req.ClientId,
        clientMetadata: req.ClientMetadata,
        source: "PostAuthentication_Authentication",
        userAttributes: user.Attributes,
        username: user.Username,
        userPoolId: userPool.options.Id,
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
