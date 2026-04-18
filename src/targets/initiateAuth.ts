import type {
  DeliveryMediumType,
  InitiateAuthRequest,
  InitiateAuthResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { v4 } from "uuid";
import {
  InvalidParameterError,
  InvalidPasswordError,
  NotAuthorizedError,
  PasswordResetRequiredError,
  UnsupportedError,
  UserNotConfirmedException,
} from "../errors";
import type { Services, UserPoolService } from "../services";
import type { AppClient } from "../services/appClient";
import type { Context } from "../services/context";
import {
  attributesToRecord,
  attributeValue,
  type MFAOption,
  type User,
} from "../services/userPoolService";
import type { Target } from "./Target";

export type InitiateAuthTarget = Target<
  InitiateAuthRequest,
  InitiateAuthResponse
>;

type InitiateAuthServices = Pick<
  Services,
  "cognito" | "messages" | "otp" | "tokenGenerator" | "triggers"
>;

const smsMfaChallenge = async (
  ctx: Context,
  user: User,
  req: InitiateAuthRequest,
  userPool: UserPoolService,
  services: InitiateAuthServices,
): Promise<InitiateAuthResponse> => {
  const smsMfaOption = user.MFAOptions?.find(
    (x): x is MFAOption & { DeliveryMedium: DeliveryMediumType } =>
      x.DeliveryMedium === "SMS",
  );
  if (!smsMfaOption) {
    throw new UnsupportedError("SMS_MFA without SMS MFAOption");
  }

  const deliveryDestination = attributeValue(
    smsMfaOption.AttributeName,
    user.Attributes,
  );
  if (!deliveryDestination) {
    throw new UnsupportedError(`SMS_MFA without ${smsMfaOption.AttributeName}`);
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
    },
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

const softwareTokenMfaChallenge = (user: User): InitiateAuthResponse => ({
  ChallengeName: "SOFTWARE_TOKEN_MFA",
  ChallengeParameters: {
    USER_ID_FOR_SRP: user.Username,
    ...(user.SoftwareTokenMfaConfiguration?.FriendlyDeviceName
      ? {
          FRIENDLY_DEVICE_NAME:
            user.SoftwareTokenMfaConfiguration.FriendlyDeviceName,
        }
      : {}),
  },
  Session: v4(),
});

const enabledMfaMethods = (
  user: User,
  userPool: UserPoolService,
): readonly ("SMS_MFA" | "SOFTWARE_TOKEN_MFA")[] => {
  const explicit = user.UserMFASettingList ?? [];
  const legacy =
    explicit.length === 0 &&
    (user.MFAOptions ?? []).some((o) => o.DeliveryMedium === "SMS")
      ? ["SMS_MFA"]
      : [];
  const methods = new Set<string>([...explicit, ...legacy]);

  const result: ("SMS_MFA" | "SOFTWARE_TOKEN_MFA")[] = [];
  if (methods.has("SMS_MFA")) result.push("SMS_MFA");
  if (
    methods.has("SOFTWARE_TOKEN_MFA") &&
    userPool.options.SoftwareTokenMfaConfiguration?.Enabled
  ) {
    result.push("SOFTWARE_TOKEN_MFA");
  }
  return result;
};

const verifyMfaChallenge = async (
  ctx: Context,
  user: User,
  req: InitiateAuthRequest,
  userPool: UserPoolService,
  services: InitiateAuthServices,
): Promise<InitiateAuthResponse> => {
  const methods = enabledMfaMethods(user, userPool);
  if (methods.length === 0) {
    throw new NotAuthorizedError();
  }

  if (methods.length > 1) {
    return {
      ChallengeName: "SELECT_MFA_TYPE",
      ChallengeParameters: {
        USER_ID_FOR_SRP: user.Username,
        MFAS_CAN_CHOOSE: JSON.stringify(methods),
      },
      Session: v4(),
    };
  }

  if (methods[0] === "SOFTWARE_TOKEN_MFA") {
    return softwareTokenMfaChallenge(user);
  }
  return smsMfaChallenge(ctx, user, req, userPool, services);
};

const verifyPasswordChallenge = async (
  ctx: Context,
  user: User,
  _req: InitiateAuthRequest,
  userPool: UserPoolService,
  userPoolClient: AppClient,
  services: InitiateAuthServices,
): Promise<InitiateAuthResponse> => {
  const userGroups = await userPool.listUserGroupMembership(ctx, user);

  const tokens = await services.tokenGenerator.generate(
    ctx,
    user,
    userGroups,
    userPoolClient,
    // The docs for the pre-token generation trigger only say that the ClientMetadata is passed as part of the
    // AdminRespondToAuthChallenge and RespondToAuthChallenge triggers.
    //
    // source: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html
    undefined,
    "Authentication",
  );

  await userPool.storeRefreshToken(ctx, tokens.RefreshToken, user);

  return {
    ChallengeName: "PASSWORD_VERIFIER",
    ChallengeParameters: {},
    AuthenticationResult: tokens,
  };
};

const newPasswordChallenge = (user: User): InitiateAuthResponse => ({
  ChallengeName: "NEW_PASSWORD_REQUIRED",
  ChallengeParameters: {
    USER_ID_FOR_SRP: user.Username,
    requiredAttributes: JSON.stringify([]),
    userAttributes: JSON.stringify(attributesToRecord(user.Attributes)),
  },
  Session: v4(),
});

const userPasswordAuthFlow = async (
  ctx: Context,
  req: InitiateAuthRequest,
  userPool: UserPoolService,
  userPoolClient: AppClient,
  services: InitiateAuthServices,
): Promise<InitiateAuthResponse> => {
  if (!req.AuthParameters) {
    throw new InvalidParameterError(
      "Missing required parameter authParameters",
    );
  }

  let user = await userPool.getUserByUsername(ctx, req.AuthParameters.USERNAME);

  if (!user && services.triggers.enabled("UserMigration")) {
    // https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html
    //
    // Amazon Cognito invokes [the User Migration] trigger when a user does not exist in the user pool at the time
    // of sign-in with a password, or in the forgot-password flow. After the Lambda function returns successfully,
    // Amazon Cognito creates the user in the user pool.
    user = await services.triggers.userMigration(ctx, {
      clientId: req.ClientId,
      password: req.AuthParameters.PASSWORD,
      userAttributes: [],
      username: req.AuthParameters.USERNAME,
      userPoolId: userPool.options.Id,

      // UserMigration triggered by InitiateAuth passes the request ClientMetadata as ValidationData and nothing as
      // the ClientMetadata.
      //
      // Source: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html#cognito-user-pools-lambda-trigger-syntax-user-migration
      clientMetadata: undefined,
      validationData: req.ClientMetadata,
    });
  }

  if (!user) {
    throw new NotAuthorizedError();
  }
  if (user.UserStatus === "RESET_REQUIRED") {
    throw new PasswordResetRequiredError();
  }
  if (user.UserStatus === "FORCE_CHANGE_PASSWORD") {
    return newPasswordChallenge(user);
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
    (userPool.options.MfaConfiguration === "OPTIONAL" && userHasMfa) ||
    userPool.options.MfaConfiguration === "ON"
  ) {
    return verifyMfaChallenge(ctx, user, req, userPool, services);
  }

  if (services.triggers.enabled("PostAuthentication")) {
    await services.triggers.postAuthentication(ctx, {
      clientId: req.ClientId,
      // As per the InitiateAuth docs, ClientMetadata is not passed to PostAuthentication when called from InitiateAuth
      // Source: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html#API_InitiateAuth_RequestSyntax
      clientMetadata: undefined,
      source: "PostAuthentication_Authentication",
      userAttributes: user.Attributes,
      username: user.Username,
      userPoolId: userPool.options.Id,
    });
  }

  return verifyPasswordChallenge(
    ctx,
    user,
    req,
    userPool,
    userPoolClient,
    services,
  );
};

const refreshTokenAuthFlow = async (
  ctx: Context,
  req: InitiateAuthRequest,
  userPool: UserPoolService,
  userPoolClient: AppClient,
  services: InitiateAuthServices,
): Promise<InitiateAuthResponse> => {
  if (!req.AuthParameters) {
    throw new InvalidParameterError(
      "Missing required parameter authParameters",
    );
  }

  if (!req.AuthParameters.REFRESH_TOKEN) {
    throw new InvalidParameterError("AuthParameters REFRESH_TOKEN is required");
  }

  const user = await userPool.getUserByRefreshToken(
    ctx,
    req.AuthParameters.REFRESH_TOKEN,
  );
  if (!user) {
    throw new NotAuthorizedError();
  }

  const userGroups = await userPool.listUserGroupMembership(ctx, user);

  const tokens = await services.tokenGenerator.generate(
    ctx,
    user,
    userGroups,
    userPoolClient,
    // The docs for the pre-token generation trigger only say that the ClientMetadata is passed as part of the
    // AdminRespondToAuthChallenge and RespondToAuthChallenge triggers.
    //
    // source: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html
    undefined,
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

export const InitiateAuth =
  (services: InitiateAuthServices): InitiateAuthTarget =>
  async (ctx, req) => {
    const userPool = await services.cognito.getUserPoolForClientId(
      ctx,
      req.ClientId,
    );
    const userPoolClient = await services.cognito.getAppClient(
      ctx,
      req.ClientId,
    );
    if (!userPoolClient) {
      throw new NotAuthorizedError();
    }

    if (req.AuthFlow === "USER_PASSWORD_AUTH") {
      return userPasswordAuthFlow(ctx, req, userPool, userPoolClient, services);
    } else if (
      req.AuthFlow === "REFRESH_TOKEN" ||
      req.AuthFlow === "REFRESH_TOKEN_AUTH"
    ) {
      return refreshTokenAuthFlow(ctx, req, userPool, userPoolClient, services);
    } else {
      throw new UnsupportedError(`InitAuth with AuthFlow=${req.AuthFlow}`);
    }
  };
