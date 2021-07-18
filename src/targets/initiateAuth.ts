import {
  InvalidPasswordError,
  NotAuthorizedError,
  PasswordResetRequiredError,
  UnsupportedError,
} from "../errors";
import { CodeDelivery, Services, UserPoolClient } from "../services";
import { generateTokens } from "../services/tokens";
import { attributeValue, User } from "../services/userPoolClient";

interface Input {
  AuthFlow: "USER_PASSWORD_AUTH" | "CUSTOM_AUTH";
  ClientId: string;
  AuthParameters: { USERNAME: string; PASSWORD: string };
  Session: string | null;
}

export interface SmsMfaOutput {
  ChallengeName: "SMS_MFA";
  ChallengeParameters: {
    CODE_DELIVERY_DELIVERY_MEDIUM: "SMS";
    CODE_DELIVERY_DESTINATION: string;
    USER_ID_FOR_SRP: string;
  };
  Session: string | null;
}

export interface PasswordVerifierOutput {
  ChallengeName: "PASSWORD_VERIFIER";
  ChallengeParameters: {};
  Session: string | null;
  AuthenticationResult: {
    IdToken: string;
    AccessToken: string;
    RefreshToken: string;
  };
}

export type Output = SmsMfaOutput | PasswordVerifierOutput;

export type InitiateAuthTarget = (body: Input) => Promise<Output>;

const verifyMfaChallenge = async (
  otp: () => string,
  user: User,
  body: Input,
  userPool: UserPoolClient,
  codeDelivery: CodeDelivery
): Promise<SmsMfaOutput> => {
  if (!user.MFAOptions?.length) {
    throw new NotAuthorizedError();
  }
  const smsMfaOption = user.MFAOptions?.find((x) => x.DeliveryMedium === "SMS");
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
  await codeDelivery(code, user, {
    ...smsMfaOption,
    Destination: deliveryDestination,
  });

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
    Session: body.Session,
  };
};

const verifyPasswordChallenge = (
  user: User,
  body: Input,
  userPool: UserPoolClient
): PasswordVerifierOutput => ({
  ChallengeName: "PASSWORD_VERIFIER",
  ChallengeParameters: {},
  AuthenticationResult: generateTokens(user, body.ClientId, userPool.config.Id),
  Session: body.Session,
});

export const InitiateAuth = ({
  codeDelivery,
  cognitoClient,
  otp,
  triggers,
}: Services): InitiateAuthTarget => async (body) => {
  if (body.AuthFlow !== "USER_PASSWORD_AUTH") {
    throw new UnsupportedError(`AuthFlow=${body.AuthFlow}`);
  }

  const userPool = await cognitoClient.getUserPoolForClientId(body.ClientId);
  let user = await userPool.getUserByUsername(body.AuthParameters.USERNAME);

  if (!user && triggers.enabled("UserMigration")) {
    // https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html
    //
    // Amazon Cognito invokes [the User Migration] trigger when a user does not exist in the user pool at the time of
    // sign-in with a password, or in the forgot-password flow. After the Lambda function returns successfully, Amazon
    // Cognito creates the user in the user pool.
    user = await triggers.userMigration({
      userPoolId: userPool.config.Id,
      clientId: body.ClientId,
      username: body.AuthParameters.USERNAME,
      password: body.AuthParameters.PASSWORD,
      userAttributes: [],
    });
  }

  if (!user) {
    throw new NotAuthorizedError();
  }
  if (user.UserStatus === "RESET_REQUIRED") {
    throw new PasswordResetRequiredError();
  }
  if (user.Password !== body.AuthParameters.PASSWORD) {
    throw new InvalidPasswordError();
  }

  if (
    (userPool.config.MfaConfiguration === "OPTIONAL" &&
      (user.MFAOptions ?? []).length > 0) ||
    userPool.config.MfaConfiguration === "ON"
  ) {
    return verifyMfaChallenge(otp, user, body, userPool, codeDelivery);
  }

  return verifyPasswordChallenge(user, body, userPool);
};
