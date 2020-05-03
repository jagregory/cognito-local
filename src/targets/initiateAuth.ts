import jwt from "jsonwebtoken";
import {
  InvalidPasswordError,
  NotAuthorizedError,
  PasswordResetRequiredError,
  UnsupportedError,
} from "../errors";
import { CodeDelivery, Services, UserPoolClient } from "../services";
import PrivateKey from "../keys/cognitoLocal.private.json";
import * as uuid from "uuid";
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

  const code = await codeDelivery(user, {
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
): PasswordVerifierOutput => {
  const eventId = uuid.v4();
  const authTime = new Date().getTime();

  return {
    ChallengeName: "PASSWORD_VERIFIER",
    ChallengeParameters: {},
    AuthenticationResult: {
      AccessToken: jwt.sign(
        {
          sub: user.Username,
          event_id: eventId,
          token_use: "access",
          scope: "aws.cognito.signin.user.admin", // TODO: scopes
          auth_time: authTime,
          jti: uuid.v4(),
          client_id: body.ClientId,
          username: user.Username,
        },
        PrivateKey.pem,
        {
          algorithm: "RS256",
          issuer: `http://localhost:9229/${userPool.config.Id}`,
          expiresIn: "24h",
          keyid: "CognitoLocal",
        }
      ),
      IdToken: jwt.sign(
        {
          sub: user.Username,
          email_verified: true,
          event_id: eventId,
          token_use: "id",
          auth_time: authTime,
          "cognito:username": user.Username,
          email: user.Attributes.filter((x) => x.Name === "email").map(
            (x) => x.Value
          )[0],
        },
        PrivateKey.pem,
        {
          algorithm: "RS256",
          // TODO: this needs to match the actual host/port we started the server on
          issuer: `http://localhost:9229/${userPool.config.Id}`,
          expiresIn: "24h",
          audience: body.ClientId,
          keyid: "CognitoLocal",
        }
      ),
      RefreshToken: "<< TODO >>",
    },
    Session: body.Session,
  };
};

export const InitiateAuth = ({
  codeDelivery,
  cognitoClient,
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
    return verifyMfaChallenge(user, body, userPool, codeDelivery);
  }

  return verifyPasswordChallenge(user, body, userPool);
};
