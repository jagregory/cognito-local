import type { GroupOverrideDetails } from "aws-lambda/trigger/cognito-user-pool-trigger/pre-token-generation";
import type { TimeUnitsType } from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { StringValue, UnitAnyCase } from "ms";
import * as uuid from "uuid";
import PrivateKey from "../keys/cognitoLocal.private.json";
import type { AppClient } from "./appClient";
import type { Clock } from "./clock";
import type { Context } from "./context";
import type { Triggers } from "./triggers";
import {
  attributesToRecord,
  attributeValue,
  customAttributes,
  type User,
} from "./userPoolService";

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
  claimsToAddOrOverride?: RawToken | undefined;
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

interface AccessTokenOverrides extends TokenOverrides {
  scopesToAdd?: string[] | undefined;
  scopesToSuppress?: string[] | undefined;
}

const applyTokenOverrides = (
  token: RawToken,
  overrides: TokenOverrides,
): RawToken => {
  // TODO: support group overrides

  const claimsToSuppress = (overrides?.claimsToSuppress ?? []).filter(
    (claim) => !RESERVED_CLAIMS.includes(claim),
  );

  const claimsToOverride = Object.entries(
    overrides?.claimsToAddOrOverride ?? [],
  ).filter(([claim]) => !RESERVED_CLAIMS.includes(claim));

  return Object.fromEntries(
    [...Object.entries(token), ...claimsToOverride].filter(
      ([claim]) => !claimsToSuppress.includes(claim),
    ),
  );
};

const applyScopeOverrides = (
  scopes: readonly string[],
  overrides: AccessTokenOverrides | undefined,
): readonly string[] => {
  const scopeSet = new Set(scopes);

  for (const scope of overrides?.scopesToAdd ?? []) {
    scopeSet.add(scope);
  }

  for (const scope of overrides?.scopesToSuppress ?? []) {
    scopeSet.delete(scope);
  }

  return Array.from(scopeSet);
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
      | "RefreshTokens",
    preTokenGenerationLambdaVersion?: "V1_0" | "V2_0",
  ): Promise<Tokens>;
}

function assertUnitAnyCase(unit: string): asserts unit is UnitAnyCase {
  if (!["seconds", "minutes", "hours", "days"].includes(unit)) {
    throw new Error(`Invalid unit: ${unit}`);
  }
}

const formatExpiration = (
  duration: number | undefined,
  unit: TimeUnitsType,
  fallback: StringValue,
): StringValue => {
  if (duration === undefined) {
    return fallback;
  }

  assertUnitAnyCase(unit);

  return `${duration}${unit}`;
};

export class JwtTokenGenerator implements TokenGenerator {
  private readonly clock: Clock;
  private readonly triggers: Triggers;
  private readonly tokenConfig: TokenConfig;

  public constructor(
    clock: Clock,
    triggers: Triggers,
    tokenConfig: TokenConfig,
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
      | "RefreshTokens",
    preTokenGenerationLambdaVersion: "V1_0" | "V2_0" = "V1_0",
  ): Promise<Tokens> {
    const eventId = uuid.v4();
    const authTime = Math.floor(this.clock.get().getTime() / 1000);
    const sub = attributeValue("sub", user.Attributes);

    let accessTokenScopes: readonly string[] = [
      "aws.cognito.signin.user.admin",
    ];

    let accessToken: RawToken = {
      auth_time: authTime,
      client_id: userPoolClient.ClientId,
      event_id: eventId,
      iat: authTime,
      jti: uuid.v4(),
      scope: accessTokenScopes.join(" "),
      sub,
      token_use: "access",
      username: user.Username,
    };
    let idToken: RawToken = {
      "cognito:username": user.Username,
      auth_time: authTime,
      email: attributeValue("email", user.Attributes),
      email_verified: Boolean(
        attributeValue("email_verified", user.Attributes) ?? false,
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
        lambdaVersion: preTokenGenerationLambdaVersion,
        scopes: accessTokenScopes,
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

      if (preTokenGenerationLambdaVersion === "V2_0") {
        const claimsAndScopeOverrideDetails =
          "claimsAndScopeOverrideDetails" in result
            ? result.claimsAndScopeOverrideDetails
            : undefined;

        const idTokenGeneration =
          claimsAndScopeOverrideDetails?.idTokenGeneration;
        const accessTokenGeneration =
          claimsAndScopeOverrideDetails?.accessTokenGeneration;

        idToken = applyTokenOverrides(idToken, idTokenGeneration ?? {});
        accessToken = applyTokenOverrides(
          accessToken,
          accessTokenGeneration ?? {},
        );
        accessTokenScopes = applyScopeOverrides(
          accessTokenScopes,
          accessTokenGeneration,
        );
      } else {
        const claimsOverrideDetails =
          "claimsOverrideDetails" in result
            ? result.claimsOverrideDetails
            : undefined;

        idToken = applyTokenOverrides(idToken, claimsOverrideDetails ?? {});
      }

      accessToken.scope = accessTokenScopes.join(" ");
    }

    const issuer = `${this.tokenConfig.IssuerDomain}/${userPoolClient.UserPoolId}`;

    return {
      AccessToken: jwt.sign(accessToken, PrivateKey.pem, {
        algorithm: "RS256",
        issuer,
        expiresIn: formatExpiration(
          userPoolClient.AccessTokenValidity,
          userPoolClient.TokenValidityUnits?.AccessToken ?? "hours",
          "24h",
        ),
        keyid: "CognitoLocal",
      } satisfies SignOptions),
      IdToken: jwt.sign(idToken, PrivateKey.pem, {
        algorithm: "RS256",
        issuer,
        expiresIn: formatExpiration(
          userPoolClient.IdTokenValidity,
          userPoolClient.TokenValidityUnits?.IdToken ?? "hours",
          "24h",
        ),
        audience: userPoolClient.ClientId,
        keyid: "CognitoLocal",
      } satisfies SignOptions),
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
            "7d",
          ),
        } satisfies SignOptions,
      ),
    };
  }
}
