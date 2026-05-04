import type {
  AdminInitiateAuthRequest,
  AdminInitiateAuthResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { v4 } from "uuid";
import {
  InvalidParameterError,
  InvalidPasswordError,
  NotAuthorizedError,
  UnsupportedError,
  UserNotConfirmedException,
} from "../errors";
import type { Services } from "../services";
import type { Context } from "../services/context";
import type { Target } from "./Target";

export type AdminInitiateAuthTarget = Target<
  AdminInitiateAuthRequest,
  AdminInitiateAuthResponse
>;

type AdminInitiateAuthServices = Pick<
  Services,
  "cognito" | "triggers" | "tokenGenerator"
>;

const adminUserPasswordAuthFlow = async (
  ctx: Context,
  services: AdminInitiateAuthServices,
  req: AdminInitiateAuthRequest,
): Promise<AdminInitiateAuthResponse> => {
  if (!req.AuthParameters) {
    throw new InvalidParameterError(
      "Missing required parameter authParameters",
    );
  }

  if (!req.AuthParameters.USERNAME || !req.AuthParameters.PASSWORD) {
    throw new InvalidParameterError(
      "AuthParameters USERNAME and PASSWORD are required",
    );
  }

  const userPool = await services.cognito.getUserPoolForClientId(
    ctx,
    req.ClientId,
  );
  const userPoolClient = await services.cognito.getAppClient(ctx, req.ClientId);
  let user = await userPool.getUserByUsername(ctx, req.AuthParameters.USERNAME);

  if (!user && services.triggers.enabled("UserMigration")) {
    // https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html
    //
    // Amazon Cognito invokes [the User Migration] trigger when a user does not exist in the user pool at the time of
    // sign-in with a password, or in the forgot-password flow. After the Lambda function returns successfully, Amazon
    // Cognito creates the user in the user pool.
    user = await services.triggers.userMigration(ctx, {
      clientMetadata: {},
      validationData: {},
      userPoolId: userPool.options.Id,
      clientId: req.ClientId,
      username: req.AuthParameters.USERNAME,
      password: req.AuthParameters.PASSWORD,
      userAttributes: [],
    });
  }

  if (!user || !userPoolClient) {
    throw new NotAuthorizedError();
  }

  if (user.Password !== req.AuthParameters.PASSWORD) {
    throw new InvalidPasswordError();
  }

  if (user.UserStatus === "UNCONFIRMED") {
    throw new UserNotConfirmedException();
  }

  const userHasMfa =
    (user.MFAOptions ?? []).length > 0 ||
    (user.UserMFASettingList ?? []).length > 0;

  if (
    userPool.options.MfaConfiguration === "ON" ||
    (userPool.options.MfaConfiguration !== "OFF" && userHasMfa)
  ) {
    if (!userHasMfa) {
      throw new NotAuthorizedError();
    }
    return {
      ChallengeName:
        user.PreferredMfaSetting === "SOFTWARE_TOKEN_MFA"
          ? "SOFTWARE_TOKEN_MFA"
          : "SMS_MFA",
      ChallengeParameters: { USER_ID_FOR_SRP: user.Username },
      Session: v4(),
      AuthenticationResult: undefined,
    };
  }

  const userGroups = await userPool.listUserGroupMembership(ctx, user);

  const tokens = await services.tokenGenerator.generate(
    ctx,
    user,
    userGroups,
    userPoolClient,
    req.ClientMetadata,
    "Authentication",
  );

  await userPool.storeRefreshToken(ctx, tokens.RefreshToken, user);

  return {
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
};

const refreshTokenAuthFlow = async (
  ctx: Context,
  services: AdminInitiateAuthServices,
  req: AdminInitiateAuthRequest,
): Promise<AdminInitiateAuthResponse> => {
  if (!req.AuthParameters) {
    throw new InvalidParameterError(
      "Missing required parameter authParameters",
    );
  }

  if (!req.AuthParameters.REFRESH_TOKEN) {
    throw new InvalidParameterError("AuthParameters REFRESH_TOKEN is required");
  }

  const userPool = await services.cognito.getUserPoolForClientId(
    ctx,
    req.ClientId,
  );
  const userPoolClient = await services.cognito.getAppClient(ctx, req.ClientId);
  const user = await userPool.getUserByRefreshToken(
    ctx,
    req.AuthParameters.REFRESH_TOKEN,
  );
  if (!user || !userPoolClient) {
    throw new NotAuthorizedError();
  }

  const userGroups = await userPool.listUserGroupMembership(ctx, user);

  const tokens = await services.tokenGenerator.generate(
    ctx,
    user,
    userGroups,
    userPoolClient,
    req.ClientMetadata,
    "RefreshTokens",
  );

  return {
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
};

const customAuthFlow = async (
  ctx: Context,
  services: AdminInitiateAuthServices,
  req: AdminInitiateAuthRequest,
): Promise<AdminInitiateAuthResponse> => {
  if (!services.triggers.enabled("DefineAuthChallenge")) {
    throw new UnsupportedError(
      "CUSTOM_AUTH requires DefineAuthChallenge trigger",
    );
  }

  if (!req.AuthParameters?.USERNAME) {
    throw new InvalidParameterError("Missing required parameter USERNAME");
  }

  const userPool = await services.cognito.getUserPoolForClientId(
    ctx,
    req.ClientId,
  );
  const user = await userPool.getUserByUsername(
    ctx,
    req.AuthParameters.USERNAME,
  );
  if (!user) {
    throw new NotAuthorizedError();
  }

  const defineResult = await services.triggers.defineAuthChallenge(ctx, {
    clientId: req.ClientId,
    userAttributes: user.Attributes,
    username: user.Username,
    userPoolId: userPool.options.Id,
    session: [],
    clientMetadata: req.ClientMetadata,
  });

  if (defineResult.failAuthentication) {
    throw new NotAuthorizedError();
  }

  if (defineResult.issueTokens) {
    const userPoolClient = await services.cognito.getAppClient(
      ctx,
      req.ClientId,
    );
    if (!userPoolClient) throw new NotAuthorizedError();
    const userGroups = await userPool.listUserGroupMembership(ctx, user);
    const tokens = await services.tokenGenerator.generate(
      ctx,
      user,
      userGroups,
      userPoolClient,
      req.ClientMetadata,
      "Authentication",
    );
    await userPool.storeRefreshToken(ctx, tokens.RefreshToken, user);
    return { AuthenticationResult: tokens };
  }

  if (!services.triggers.enabled("CreateAuthChallenge")) {
    throw new UnsupportedError(
      "CUSTOM_AUTH requires CreateAuthChallenge trigger",
    );
  }

  const challengeResult = await services.triggers.createAuthChallenge(ctx, {
    clientId: req.ClientId,
    userAttributes: user.Attributes,
    username: user.Username,
    userPoolId: userPool.options.Id,
    challengeName: defineResult.challengeName ?? "CUSTOM_CHALLENGE",
    session: [],
    clientMetadata: req.ClientMetadata,
  });

  return {
    ChallengeName: "CUSTOM_CHALLENGE",
    ChallengeParameters: {
      ...challengeResult.publicChallengeParameters,
      USER_ID_FOR_SRP: user.Username,
    },
    Session: v4(),
  };
};

export const AdminInitiateAuth =
  (services: AdminInitiateAuthServices): AdminInitiateAuthTarget =>
  async (ctx, req) => {
    if (
      req.AuthFlow === "ADMIN_USER_PASSWORD_AUTH" ||
      req.AuthFlow === "ADMIN_NO_SRP_AUTH"
    ) {
      return adminUserPasswordAuthFlow(ctx, services, req);
    } else if (
      req.AuthFlow === "REFRESH_TOKEN_AUTH" ||
      req.AuthFlow === "REFRESH_TOKEN"
    ) {
      return refreshTokenAuthFlow(ctx, services, req);
    } else if (req.AuthFlow === "CUSTOM_AUTH") {
      return customAuthFlow(ctx, services, req);
    } else {
      throw new UnsupportedError(`AdminInitAuth with AuthFlow=${req.AuthFlow}`);
    }
  };
