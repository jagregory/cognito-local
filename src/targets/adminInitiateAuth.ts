import {
  DeliveryMediumType,
  AdminInitiateAuthRequest,
  AdminInitiateAuthResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { v4 } from "uuid";
import {
  InvalidParameterError,
  InvalidPasswordError,
  MFAMethodNotFoundException,
  NotAuthorizedError,
  UnsupportedError,
  UserNotFoundError,
} from "../errors";
import { Services, UserPoolService } from "../services";
import { attributeValue, MFAOption, User } from "../services/userPoolService";
import { Target } from "./Target";
import { Context } from "../services/context";

export type AdminInitiateAuthTarget = Target<
  AdminInitiateAuthRequest,
  AdminInitiateAuthResponse
>;

export type AdminInitiateAuthServices = Pick<
  Services,
  "cognito" | "messages" | "otp" | "triggers" | "tokenGenerator"
>;

export const verifyMfaChallenge = async (
  ctx: Context,
  user: User,
  req: AdminInitiateAuthRequest,
  userPool: UserPoolService,
  services: AdminInitiateAuthServices
): Promise<AdminInitiateAuthResponse> => {
  if (!user.MFAOptions?.length) {
    throw new NotAuthorizedError();
  }
  const smsMfaOption = user.MFAOptions?.find(
    (x): x is MFAOption & { DeliveryMedium: DeliveryMediumType } =>
      x.DeliveryMedium === "SMS"
  );
  if (!smsMfaOption) {
    throw new MFAMethodNotFoundException();
  }

  const deliveryDestination = attributeValue(
    smsMfaOption.AttributeName,
    user.Attributes
  );
  if (!deliveryDestination) {
    throw new MFAMethodNotFoundException();
  }

  const code = services.otp();
  await services.messages.deliver(
    ctx,
    "Authentication",
    req.ClientId,
    userPool.options.Id,
    user,
    code,
    req.ClientMetadata,
    {
      DeliveryMedium: smsMfaOption.DeliveryMedium,
      AttributeName: smsMfaOption.AttributeName,
      Destination: deliveryDestination,
    }
  );

  await userPool.saveUser(ctx, {
    ...user,
    MFACode: code,
  });

  return {
    ChallengeName: "SMS_MFA",
    ChallengeParameters: {
      CODE_DELIVERY_DELIVERY_MEDIUM: "SMS",
      CODE_DELIVERY_DESTINATION: deliveryDestination,
      USER_ID_FOR_SRP: user.Username,
    },
    Session: v4(),
  };
};

const adminUserPasswordAuthFlow = async (
  ctx: Context,
  services: AdminInitiateAuthServices,
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

  const userPool = await services.cognito.getUserPoolForClientId(
    ctx,
    req.ClientId
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

  if (user.UserStatus === "FORCE_CHANGE_PASSWORD") {
    return {
      ChallengeName: "NEW_PASSWORD_REQUIRED",
      ChallengeParameters: { USER_ID_FOR_SRP: user.Username },
      Session: v4(),
    };
  }

  if (
    (userPool.options.MfaConfiguration === "OPTIONAL" &&
      (user.MFAOptions ?? []).length > 0) ||
    userPool.options.MfaConfiguration === "ON"
  ) {
    return verifyMfaChallenge(ctx, user, req, userPool, services);
  }

  const userGroups = await userPool.listUserGroupMembership(ctx, user);

  const tokens = await services.tokenGenerator.generate(
    ctx,
    user,
    userGroups,
    userPoolClient,
    req.ClientMetadata,
    "Authentication"
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

  const userPool = await services.cognito.getUserPoolForClientId(
    ctx,
    req.ClientId
  );
  const userPoolClient = await services.cognito.getAppClient(ctx, req.ClientId);
  const user = await userPool.getUserByRefreshToken(
    ctx,
    req.AuthParameters.REFRESH_TOKEN
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
    "RefreshTokens"
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

export const AdminInitiateAuth =
  (services: AdminInitiateAuthServices): AdminInitiateAuthTarget =>
  async (ctx, req) => {
    if (req.AuthFlow === "ADMIN_USER_PASSWORD_AUTH") {
      return adminUserPasswordAuthFlow(ctx, services, req);
    } else if (
      req.AuthFlow === "REFRESH_TOKEN_AUTH" ||
      req.AuthFlow === "REFRESH_TOKEN"
    ) {
      return refreshTokenAuthFlow(ctx, services, req);
    } else {
      throw new UnsupportedError(`AdminInitAuth with AuthFlow=${req.AuthFlow}`);
    }
  };
