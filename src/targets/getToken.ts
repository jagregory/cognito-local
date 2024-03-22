import {
  InvalidParameterError,
  NotAuthorizedError,
  NotImplementedError,
} from "../errors";
import { Services } from "../services";
import { Context } from "../services/context";
import { Target } from "../targets/Target";

type HandleTokenServices = Pick<Services, "cognito" | "tokenGenerator">;

export type GetTokenRequest =
  | GetTokenRequestClientCreds
  | GetTokenRequestRefreshToken
  | GetTokenRequestAuthCode;

interface GetTokenRequestGrantType {
  grant_type: "authorization_code" | "client_credentials" | "refresh_token";
  client_id: string;
}

interface GetTokenRequestClientCreds extends GetTokenRequestGrantType {
  client_secret: string;
}

type GetTokenRequestAuthCode = GetTokenRequestGrantType;

interface GetTokenRequestRefreshToken extends GetTokenRequestGrantType {
  refresh_token: string;
}

interface GetTokenResponse {
  access_token: string;
  refresh_token?: string;
}

export type GetTokenTarget = Target<GetTokenRequest, GetTokenResponse>;

async function getWithRefreshToken(
  ctx: Context,
  services: HandleTokenServices,
  params: GetTokenRequestRefreshToken
) {
  const clientId = params.client_id;
  const userPool = await services.cognito.getUserPoolForClientId(ctx, clientId);
  const userPoolClient = await services.cognito.getAppClient(ctx, clientId);
  const user = await userPool.getUserByRefreshToken(ctx, params.refresh_token);
  if (!user || !userPoolClient) {
    throw new NotAuthorizedError();
  }

  const userGroups = await userPool.listUserGroupMembership(ctx, user);

  const tokens = await services.tokenGenerator.generate(
    ctx,
    user,
    userGroups,
    userPoolClient,
    undefined,
    "RefreshTokens"
  );

  return {
    access_token: tokens.AccessToken,
    refresh_token: tokens.RefreshToken,
  };
}

async function getWithClientCredentials(
  ctx: Context,
  services: HandleTokenServices,
  params: GetTokenRequestClientCreds
) {
  const clientId = params.client_id;
  const clientSecret = params.client_secret;
  const userPoolClient = await services.cognito.getAppClient(ctx, clientId);
  if (!userPoolClient) {
    throw new NotAuthorizedError();
  }
  if (
    userPoolClient.ClientSecret &&
    userPoolClient.ClientSecret != clientSecret
  ) {
    throw new NotAuthorizedError();
  }

  const tokens = await services.tokenGenerator.generateWithClientCreds(
    ctx,
    userPoolClient
  );
  if (!tokens) {
    throw new NotAuthorizedError();
  }

  return {
    access_token: tokens.AccessToken,
  };
}

export const GetToken =
  (services: HandleTokenServices): GetTokenTarget =>
  async (ctx, req) => {
    switch (req.grant_type) {
      case "authorization_code": {
        throw new NotImplementedError();
      }
      case "client_credentials": {
        return getWithClientCredentials(
          ctx,
          services,
          req as GetTokenRequestClientCreds
        );
      }
      case "refresh_token": {
        return getWithRefreshToken(
          ctx,
          services,
          req as GetTokenRequestRefreshToken
        );
      }
      default: {
        console.log("Invalid grant type passed:", req.grant_type);
        throw new InvalidParameterError();
      }
    }
  };
