import {
  AdminInitiateAuthRequest,
  AdminInitiateAuthResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";
import {
  InvalidParameterError,
  InvalidPasswordError,
  NotAuthorizedError,
  UnsupportedError,
} from "../errors";
import { generateTokens } from "../services/tokens";

export type AdminInitiateAuthTarget = (
  req: AdminInitiateAuthRequest
) => Promise<AdminInitiateAuthResponse>;

type AuthServices = Pick<Services, "cognito" | "clock" | "triggers">;

const handleAdminUserPasswordAuth = async (
  services: AuthServices,
  req: AdminInitiateAuthRequest
): Promise<AdminInitiateAuthResponse> => {
  if (!req.AuthParameters) {
    throw new InvalidParameterError(
      "Missing required parameter authParameters"
    );
  }

  if (!req.AuthParameters.USERNAME || !req.AuthParameters.PASSWORD) {
    throw new InvalidParameterError(
      "AuthParameters USERNAME and PASSWORD are required"
    );
  }

  const userPool = await services.cognito.getUserPoolForClientId(req.ClientId);
  let user = await userPool.getUserByUsername(req.AuthParameters.USERNAME);

  if (!user && services.triggers.enabled("UserMigration")) {
    // https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html
    //
    // Amazon Cognito invokes [the User Migration] trigger when a user does not exist in the user pool at the time of
    // sign-in with a password, or in the forgot-password flow. After the Lambda function returns successfully, Amazon
    // Cognito creates the user in the user pool.
    user = await services.triggers.userMigration({
      clientMetadata: {},
      validationData: {},
      userPoolId: userPool.config.Id,
      clientId: req.ClientId,
      username: req.AuthParameters.USERNAME,
      password: req.AuthParameters.PASSWORD,
      userAttributes: [],
    });
  }

  if (!user) {
    throw new NotAuthorizedError();
  }

  if (user.Password !== req.AuthParameters.PASSWORD) {
    throw new InvalidPasswordError();
  }

  const tokens = generateTokens(
    user,
    req.ClientId,
    userPool.config.Id,
    {},
    services.clock
  );

  const refreshTokens = Array.isArray(user.RefreshTokens)
    ? user.RefreshTokens
    : [];
  refreshTokens.push(tokens.RefreshToken);

  await userPool.saveUser({
    ...user,
    RefreshTokens: refreshTokens,
  });

  const response: AdminInitiateAuthResponse = {
    ChallengeName: undefined,
    Session: undefined,
    ChallengeParameters: undefined,
    AuthenticationResult: {
      AccessToken: tokens.AccessToken,
      RefreshToken: tokens.RefreshToken,
      IdToken: tokens.IdToken,
      NewDeviceMetadata: undefined,
      TokenType: undefined,
      ExpiresIn: undefined,
    },
  };

  return response;
};

const handleRefreshTokenAuth = async (
  services: AuthServices,
  req: AdminInitiateAuthRequest
): Promise<AdminInitiateAuthResponse> => {
  if (!req.AuthParameters) {
    throw new InvalidParameterError(
      "Missing required parameter authParameters"
    );
  }

  if (!req.AuthParameters.REFRESH_TOKEN) {
    throw new InvalidParameterError("AuthParameters REFRESH_TOKEN is required");
  }

  const userPool = await services.cognito.getUserPoolForClientId(req.ClientId);

  const users = await userPool.listUsers();
  const user = users.find(
    (user) =>
      req.AuthParameters &&
      Array.isArray(user.RefreshTokens) &&
      user.RefreshTokens.includes(req.AuthParameters.REFRESH_TOKEN)
  );

  if (!user) {
    throw new NotAuthorizedError();
  }

  const tokens = generateTokens(
    user,
    req.ClientId,
    userPool.config.Id,
    {},
    services.clock
  );

  const response: AdminInitiateAuthResponse = {
    ChallengeName: undefined,
    Session: undefined,
    ChallengeParameters: undefined,
    AuthenticationResult: {
      AccessToken: tokens.AccessToken,
      RefreshToken: undefined,
      IdToken: tokens.IdToken,
      NewDeviceMetadata: undefined,
      TokenType: undefined,
      ExpiresIn: undefined,
    },
  };

  return response;
};

export const AdminInitiateAuth =
  (services: AuthServices): AdminInitiateAuthTarget =>
  async (req) => {
    if (req.AuthFlow === "ADMIN_USER_PASSWORD_AUTH") {
      return handleAdminUserPasswordAuth(services, req);
    } else if (req.AuthFlow === "REFRESH_TOKEN_AUTH") {
      return handleRefreshTokenAuth(services, req);
    } else {
      throw new UnsupportedError(`InitAuth with AuthFlow=${req.AuthFlow}`);
    }
  };
