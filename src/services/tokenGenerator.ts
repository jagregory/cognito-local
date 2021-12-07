import { StringMap } from "aws-lambda/trigger/cognito-user-pool-trigger/_common";
import { GroupOverrideDetails } from "aws-lambda/trigger/cognito-user-pool-trigger/pre-token-generation";
import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import PrivateKey from "../keys/cognitoLocal.private.json";
import { Clock } from "./clock";
import { Context } from "./context";
import { Triggers } from "./triggers";
import {
  attributesToRecord,
  attributeValue,
  customAttributes,
  User,
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
  claimsToAddOrOverride?: StringMap | undefined;
  claimsToSuppress?: string[] | undefined;
  groupOverrideDetails?: GroupOverrideDetails | undefined;
}

const applyTokenOverrides = (
  token: Record<string, string | number | boolean | undefined>,
  overrides: TokenOverrides
): Record<string, string | number | boolean | undefined> => {
  // TODO: support group overrides

  return Object.fromEntries(
    [
      ...Object.entries(token),
      ...Object.entries(overrides?.claimsToAddOrOverride ?? []),
    ].filter(([k]) => !overrides?.claimsToSuppress?.includes(k))
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
    clientId: string,
    userPoolId: string,
    clientMetadata: Record<string, string> | undefined,
    source:
      | "AuthenticateDevice"
      | "Authentication"
      | "HostedAuth"
      | "NewPasswordChallenge"
      | "RefreshTokens"
  ): Promise<Tokens>;
}

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
    clientId: string,
    userPoolId: string,
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

    let idToken: Record<string, string | number | boolean | undefined> = {
      "cognito:username": user.Username,
      auth_time: authTime,
      email: attributeValue("email", user.Attributes),
      email_verified: Boolean(
        attributeValue("email_verified", user.Attributes) ?? false
      ),
      event_id: eventId,
      jti: uuid.v4(),
      sub,
      token_use: "id",
      ...attributesToRecord(customAttributes(user.Attributes)),
    };

    if (this.triggers.enabled("PreTokenGeneration")) {
      const result = await this.triggers.preTokenGeneration(ctx, {
        clientId,
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
        userPoolId,
      });

      idToken = applyTokenOverrides(idToken, result.claimsOverrideDetails);
    }

    const issuer = `${this.tokenConfig.IssuerDomain}/${userPoolId}`;

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
      IdToken: jwt.sign(idToken, PrivateKey.pem, {
        algorithm: "RS256",
        issuer,
        expiresIn: "24h",
        audience: clientId,
        keyid: "CognitoLocal",
      }),
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
}
