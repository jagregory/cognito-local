import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import PrivateKey from "../keys/cognitoLocal.private.json";
import { Clock } from "./clock";
import { attributeValue, User } from "./userPoolService";

export interface TokenConfig {
  IssuerDomain?: string;
}

export interface Token {
  client_id: string;
  iss: string;
  sub: string;
  token_use: string;
  username: string;
  event_id: string;
  scope: string;
  auth_time: Date;
  jti: string;
}

export function generateTokens(
  user: User,
  clientId: string,
  userPoolId: string,
  tokenConfig: TokenConfig,
  clock: Clock
) {
  const eventId = uuid.v4();
  const authTime = Math.floor(clock.get().getTime() / 1000);
  const sub = attributeValue("sub", user.Attributes);

  const customAttributes = user.Attributes.reduce<{
    [key: string]: string | undefined;
  }>((acc, attr) => {
    if (attr.Name.startsWith("custom:")) {
      acc[attr.Name] = attr.Value;
    }

    return acc;
  }, {});

  const issuer = `${tokenConfig.IssuerDomain}/${userPoolId}`;
  return {
    AccessToken: jwt.sign(
      {
        auth_time: authTime,
        client_id: clientId,
        event_id: eventId,
        jti: uuid.v4(),
        scope: "aws.cognito.signin.user.admin", // TODO: scopes
        sub,
        token_use: "access",
        username: user.Username,
      },
      PrivateKey.pem,
      {
        algorithm: "RS256",
        issuer,
        expiresIn: "24h",
        keyid: "CognitoLocal",
      }
    ),
    IdToken: jwt.sign(
      {
        "cognito:username": user.Username,
        auth_time: authTime,
        email: attributeValue("email", user.Attributes),
        email_verified: true,
        event_id: eventId,
        jti: uuid.v4(),
        sub,
        token_use: "id",
        ...customAttributes,
      },
      PrivateKey.pem,
      {
        algorithm: "RS256",
        issuer,
        expiresIn: "24h",
        audience: clientId,
        keyid: "CognitoLocal",
      }
    ),
    // this content is for debugging purposes only
    // in reality token payload is encrypted and uses different algorithm
    RefreshToken: jwt.sign(
      {
        "cognito:username": user.Username,
        email: attributeValue("email", user.Attributes),
        jti: uuid.v4(),
      },
      PrivateKey.pem,
      {
        algorithm: "RS256",
        issuer,
        expiresIn: "7d",
      }
    ),
  };
}
