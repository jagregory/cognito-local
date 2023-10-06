import { StringMap } from "aws-lambda/trigger/cognito-user-pool-trigger/_common";
import { GroupOverrideDetails } from "aws-lambda/trigger/cognito-user-pool-trigger/pre-token-generation";
import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import PrivateKey from "../keys/cognitoLocal.private.json";
import { AppClient } from "./appClient";
import { Clock } from "./clock";
import { Context } from "./context";
import { Triggers } from "./triggers";
import {
  attributesToRecord,
  attributeValue,
  customAttributes,
  User,
} from "./userPoolService";

type ValidityUnit = "seconds" | "minutes" | "hours" | "days" | string;

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

interface TokenOverrides {
  claimsToAddOrOverride?: StringMap | undefined;
  claimsToSuppress?: string[] | undefined;
  groupOverrideDetails?: GroupOverrideDetails | undefined;
}

const RESERVED_CLAIMS = [
  "acr",
  "amr",
  "aud",
  "at_hash",
  "auth_time",
  "azp",
  "cognito:username",
  "exp",
  "iat",
  "identities",
  "iss",
  "jti",
  "nbf",
  "nonce",
  "origin_jti",
  "sub",
  "token_use",
];

type RawToken = Record<
  string,
  string | number | boolean | undefined | readonly string[]
>;

const applyTokenOverrides = (
  token: RawToken,
  overrides: TokenOverrides
): RawToken => {
  // TODO: support group overrides

  const claimsToSuppress = (overrides?.claimsToSuppress ?? []).filter(
    (claim) => !RESERVED_CLAIMS.includes(claim)
  );

  const claimsToOverride = Object.entries(
    overrides?.claimsToAddOrOverride ?? []
  ).filter(([claim]) => !RESERVED_CLAIMS.includes(claim));

  return Object.fromEntries(
    [...Object.entries(token), ...claimsToOverride].filter(
      ([claim]) => !claimsToSuppress.includes(claim)
    )
  );
};

export interface Tokens {
  readonly AccessToken: string;
  readonly IdToken: string;
  readonly RefreshToken: string;
}

export interface TokenGenerator {
  generate(
    ctx: Context,
    user: User,
    userGroups: readonly string[],
    userPoolClient: AppClient,
    clientMetadata: Record<string, string> | undefined,
    source:
      | "AuthenticateDevice"
      | "Authentication"
      | "HostedAuth"
      | "NewPasswordChallenge"
      | "RefreshTokens"
  ): Promise<Tokens>;
}

const formatExpiration = (
  duration: number | undefined,
  unit: ValidityUnit,
  fallback: string
): string => (duration ? `${duration}${unit}` : fallback);

export class JwtTokenGenerator implements TokenGenerator {
  private readonly clock: Clock;
  private readonly triggers: Triggers;
  private readonly tokenConfig: TokenConfig;

  public constructor(
    clock: Clock,
    triggers: Triggers,
    tokenConfig: TokenConfig
  ) {
    this.clock = clock;
    this.triggers = triggers;
    this.tokenConfig = tokenConfig;
  }

  public async generate(
    ctx: Context,
    user: User,
    userGroups: readonly string[],
    userPoolClient: AppClient,
    clientMetadata: Record<string, string> | undefined,
    source:
      | "AuthenticateDevice"
      | "Authentication"
      | "HostedAuth"
      | "NewPasswordChallenge"
      | "RefreshTokens"
  ): Promise<Tokens> {
    const eventId = uuid.v4();
    const authTime = Math.floor(this.clock.get().getTime() / 1000);
    const sub = attributeValue("sub", user.Attributes);

    const accessToken: RawToken = {
      auth_time: authTime,
      client_id: userPoolClient.ClientId,
      event_id: eventId,
      iat: authTime,
      jti: uuid.v4(),
      scope: "aws.cognito.signin.user.admin", // TODO: scopes
      sub,
      token_use: "access",
      username: user.Username,
    };
    let idToken: RawToken = {
      "cognito:username": user.Username,
      auth_time: authTime,
      email: attributeValue("email", user.Attributes),
      email_verified: Boolean(
        "true" == attributeValue("email_verified", user.Attributes) ?? false
      ),
      event_id: eventId,
      iat: authTime,
      jti: uuid.v4(),
      sub,
      token_use: "id",
      ...attributesToRecord(customAttributes(user.Attributes)),
    };

    if (userGroups.length) {
      accessToken["cognito:groups"] = userGroups;
      idToken["cognito:groups"] = userGroups;
    }

    if (this.triggers.enabled("PreTokenGeneration")) {
      const result = await this.triggers.preTokenGeneration(ctx, {
        clientId: userPoolClient.ClientId,
        clientMetadata,
        source,
        userAttributes: user.Attributes,
        username: user.Username,
        groupConfiguration: {
          // TODO: this should be populated from the user's groups
          groupsToOverride: undefined,
          iamRolesToOverride: undefined,
          preferredRole: undefined,
        },
        userPoolId: userPoolClient.UserPoolId,
      });

      idToken = applyTokenOverrides(idToken, result.claimsOverrideDetails);
    }

    const issuer = `${this.tokenConfig.IssuerDomain}/${userPoolClient.UserPoolId}`;

    return {
      AccessToken: jwt.sign(accessToken, PrivateKey.pem, {
        algorithm: "RS256",
        issuer,
        expiresIn: formatExpiration(
          userPoolClient.AccessTokenValidity,
          userPoolClient.TokenValidityUnits?.AccessToken ?? "hours",
          "24h"
        ),
        keyid: "CognitoLocal",
      }),
      IdToken: jwt.sign(idToken, PrivateKey.pem, {
        algorithm: "RS256",
        issuer,
        expiresIn: formatExpiration(
          userPoolClient.IdTokenValidity,
          userPoolClient.TokenValidityUnits?.IdToken ?? "hours",
          "24h"
        ),
        audience: userPoolClient.ClientId,
        keyid: "CognitoLocal",
      }),
      // this content is for debugging purposes only
      // in reality token payload is encrypted and uses different algorithm
      RefreshToken: jwt.sign(
        {
          "cognito:username": user.Username,
          email: attributeValue("email", user.Attributes),
          iat: authTime,
          jti: uuid.v4(),
        },
        PrivateKey.pem,
        {
          algorithm: "RS256",
          issuer,
          expiresIn: formatExpiration(
            userPoolClient.RefreshTokenValidity,
            userPoolClient.TokenValidityUnits?.RefreshToken ?? "days",
            "7d"
          ),
        }
      ),
    };
  }
}
