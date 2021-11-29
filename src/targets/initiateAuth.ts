import {
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
} from "../errors";
import {
  Clock,
  MessageDelivery,
  Messages,
  Services,
  UserPoolService,
} from "../services";
import { generateTokens, TokenConfig } from "../services/tokens";
import {
  attributesToRecord,
  attributeValue,
  MFAOption,
  User,
} from "../services/userPoolService";

export type InitiateAuthTarget = (
  req: InitiateAuthRequest
) => Promise<InitiateAuthResponse>;

const verifyMfaChallenge = async (
  otp: () => string,
  messages: Messages,
  user: User,
  req: InitiateAuthRequest,
  userPool: UserPoolService,
  messageDelivery: MessageDelivery
): Promise<InitiateAuthResponse> => {
  if (!user.MFAOptions?.length) {
    throw new NotAuthorizedError();
  }
  const smsMfaOption = user.MFAOptions?.find(
    (x): x is MFAOption & { DeliveryMedium: DeliveryMediumType } =>
      x.DeliveryMedium === "SMS"
  );
  if (!smsMfaOption) {
    throw new UnsupportedError("MFA challenge without SMS");
  }

  const deliveryDestination = attributeValue(
    smsMfaOption.AttributeName,
    user.Attributes
  );
  if (!deliveryDestination) {
    throw new UnsupportedError(`SMS_MFA without ${smsMfaOption.AttributeName}`);
  }

  const code = otp();
  const message = await messages.authentication(
    req.ClientId,
    userPool.config.Id,
    user,
    code,
    req.ClientMetadata
  );
  await messageDelivery.deliver(
    user,
    {
      DeliveryMedium: smsMfaOption.DeliveryMedium,
      AttributeName: smsMfaOption.AttributeName,
      Destination: deliveryDestination,
    },
    message
  );

  await userPool.saveUser({
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
  };
};

const verifyPasswordChallenge = (
  user: User,
  req: InitiateAuthRequest,
  userPool: UserPoolService,
  tokenConfig: TokenConfig,
  clock: Clock
): InitiateAuthResponse => ({
  ChallengeName: "PASSWORD_VERIFIER",
  ChallengeParameters: {},
  AuthenticationResult: generateTokens(
    user,
    req.ClientId,
    userPool.config.Id,
    tokenConfig,
    clock
  ),
});

const newPasswordChallenge = (user: User): InitiateAuthResponse => ({
  ChallengeName: "NEW_PASSWORD_REQUIRED",
  ChallengeParameters: {
    USER_ID_FOR_SRP: user.Username,
    requiredAttributes: JSON.stringify([]),
    userAttributes: JSON.stringify(attributesToRecord(user.Attributes)),
  },
  Session: v4(),
});

export const InitiateAuth =
  ({
    cognito,
    config,
    clock,
    messageDelivery,
    messages,
    otp,
    triggers,
  }: Services): InitiateAuthTarget =>
  async (req) => {
    if (req.AuthFlow !== "USER_PASSWORD_AUTH") {
      throw new UnsupportedError(`InitAuth with AuthFlow=${req.AuthFlow}`);
    }
    if (!req.AuthParameters) {
      throw new InvalidParameterError(
        "Missing required parameter authParameters"
      );
    }

    const userPool = await cognito.getUserPoolForClientId(req.ClientId);
    let user = await userPool.getUserByUsername(req.AuthParameters.USERNAME);

    if (!user && triggers.enabled("UserMigration")) {
      // https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html
      //
      // Amazon Cognito invokes [the User Migration] trigger when a user does not exist in the user pool at the time of
      // sign-in with a password, or in the forgot-password flow. After the Lambda function returns successfully, Amazon
      // Cognito creates the user in the user pool.
      user = await triggers.userMigration({
        clientId: req.ClientId,
        password: req.AuthParameters.PASSWORD,
        userAttributes: [],
        username: req.AuthParameters.USERNAME,
        userPoolId: userPool.config.Id,

        // UserMigration triggered by InitiateAuth does not passes the request ClientMetadata as ValidationData and
        // nothing as the ClientMetadata.
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

    if (
      (userPool.config.MfaConfiguration === "OPTIONAL" &&
        (user.MFAOptions ?? []).length > 0) ||
      userPool.config.MfaConfiguration === "ON"
    ) {
      return verifyMfaChallenge(
        otp,
        messages,
        user,
        req,
        userPool,
        messageDelivery
      );
    }

    const result = verifyPasswordChallenge(
      user,
      req,
      userPool,
      config.TokenConfig,
      clock
    );

    if (triggers.enabled("PostAuthentication")) {
      await triggers.postAuthentication({
        clientId: req.ClientId,
        // As per the InitiateAuth docs, ClientMetadata is not passed to PostAuthentication when called from InitiateAuth
        // Source: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html#API_InitiateAuth_RequestSyntax
        clientMetadata: undefined,
        source: "PostAuthentication_Authentication",
        userAttributes: user.Attributes,
        username: user.Username,
        userPoolId: userPool.config.Id,
      });
    }

    return result;
  };
