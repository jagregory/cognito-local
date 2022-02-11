import {
  AdminRespondToAuthChallengeRequest,
  AdminRespondToAuthChallengeResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import {
  InvalidParameterError,
  NotAuthorizedError,
  UnsupportedError,
} from "../errors";
import { Services } from "../services";
import { Context, Target } from "./router";

export type AdminRespondToAuthChallengeTarget = Target<
  AdminRespondToAuthChallengeRequest,
  AdminRespondToAuthChallengeResponse
>;

type AdminInitiateAuthServices = Pick<Services, "cognito">;

const adminUserNewPasswordChallenge = async (
  ctx: Context,
  services: AdminInitiateAuthServices,
  req: AdminRespondToAuthChallengeRequest
): Promise<AdminRespondToAuthChallengeResponse> => {
  if (!req.ChallengeResponses) {
    throw new InvalidParameterError(
      "Missing required parameter ChallengeResponses"
    );
  }

  if (
    !req.ChallengeResponses.USERNAME ||
    !req.ChallengeResponses.NEW_PASSWORD
  ) {
    throw new InvalidParameterError(
      "ChallengeResponses USERNAME and NEW_PASSWORD are required"
    );
  }

  const userPool = await services.cognito.getUserPoolForClientId(
    ctx,
    req.ClientId
  );

  const user = await userPool.getUserByUsername(
    ctx,
    req.ChallengeResponses.USERNAME
  );

  if (!user) {
    throw new NotAuthorizedError();
  }

  await userPool.saveUser(ctx, {
    ...user,
    Password: req.ChallengeResponses.NEW_PASSWORD,
    UserStatus: "CONFIRMED",
  });

  return {
    ChallengeName: undefined,
    Session: undefined,
    ChallengeParameters: undefined,
    AuthenticationResult: {
      NewDeviceMetadata: undefined,
      TokenType: undefined,
      ExpiresIn: undefined,
    },
  };
};

export const AdminRespondToAuthChallenge =
  (services: AdminInitiateAuthServices): AdminRespondToAuthChallengeTarget =>
  async (ctx, req) => {
    if (req.ChallengeName === "NEW_PASSWORD_REQUIRED") {
      return adminUserNewPasswordChallenge(ctx, services, req);
    } else {
      throw new UnsupportedError(
        `AdminInitAuth with ChallengeName=${req.ChallengeName}`
      );
    }
  };
