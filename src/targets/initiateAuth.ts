import jwt from "jsonwebtoken";
import {
  InvalidPasswordError,
  NotAuthorizedError,
  UnsupportedError,
} from "../errors";
import { Services } from "../services";

interface Input {
  AuthFlow: "USER_PASSWORD_AUTH" | "CUSTOM_AUTH";
  ClientId: string;
  AuthParameters: { USERNAME: string; PASSWORD: string };
}

interface Output {
  ChallengeName: "CUSTOM_CHALLENGE" | "PASSWORD_VERIFIER";
  ChallengeParameters: Record<string, string>;
  Session: string;
  AuthenticationResult: {
    IdToken?: string;
    AccessToken?: string;
    RefreshToken?: string;
  };
}

export type InitiateAuthTarget = (body: Input) => Promise<Output>;

export const InitiateAuth = ({
  storage,
}: Services): InitiateAuthTarget => async (body) => {
  if (body.AuthFlow !== "USER_PASSWORD_AUTH") {
    throw new UnsupportedError(`AuthFlow=${body.AuthFlow}`);
  }

  const user = await storage.getUserByUsername(body.AuthParameters.USERNAME);

  if (!user) {
    throw new NotAuthorizedError();
  }

  if (user.Password !== body.AuthParameters.PASSWORD) {
    throw new InvalidPasswordError();
  }

  return {
    ChallengeName: "PASSWORD_VERIFIER",
    ChallengeParameters: {},
    AuthenticationResult: {
      AccessToken: jwt.sign(
        {
          sub: user.Username,
          event_id: "439a2a30-ecbc-4788-9ce6-fc6eb9a2d535",
          token_use: "access",
          scope: "aws.cognito.signin.user.admin",
          auth_time: 1585450518,
          jti: "b398b959-9f2f-40fa-9832-0a237524e460",
          client_id: body.ClientId,
          username: user.Username,
        },
        "secret",
        {
          issuer: "http://localhost:9229/user-pool-id",
          expiresIn: "24h",
        }
      ),
      IdToken: jwt.sign(
        {
          sub: user.Username,
          email_verified: true,
          event_id: "439a2a30-ecbc-4788-9ce6-fc6eb9a2d535",
          token_use: "id",
          auth_time: 1585450518,
          "cognito:username": user.Username,
          email: user.Attributes.filter((x) => x.Name === "email").map(
            (x) => x.Value
          )[0],
        },
        "secret",
        {
          issuer: "http://localhost:9229/user-pool-id",
          expiresIn: "24h",
          audience: body.ClientId,
        }
      ),
      RefreshToken: "<< TODO >>",
    },
    Session: "",
  };
};
