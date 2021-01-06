import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import PrivateKey from "../keys/cognitoLocal.private.json";
import { User } from "./userPoolClient";

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
  userPoolId: string
) {
  const eventId = uuid.v4();
  const authTime = Math.floor(new Date().getTime() / 1000);

  return {
    AccessToken: jwt.sign(
      {
        sub: user.Username,
        event_id: eventId,
        token_use: "access",
        scope: "aws.cognito.signin.user.admin", // TODO: scopes
        auth_time: authTime,
        jti: uuid.v4(),
        client_id: clientId,
        username: user.Username,
      },
      PrivateKey.pem,
      {
        algorithm: "RS256",
        issuer: `http://localhost:9229/${userPoolId}`,
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
        issuer: `http://localhost:9229/${userPoolId}`,
        expiresIn: "24h",
        audience: clientId,
        keyid: "CognitoLocal",
      }
    ),
    RefreshToken: "<< TODO >>",
  };
}
