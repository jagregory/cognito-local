import {
  InvalidParameterError,
  NotAuthorizedError,
  NotImplementedError,
} from "../errors";
import { Services } from "../services";
import { Context } from "../services/context";
import { Target } from "../targets/Target";

type HandleTokenServices = Pick<Services, "cognito" | "tokenGenerator">;

type GetTokenRequest = URLSearchParams;

interface GetTokenResponse {
  access_token: string;
  refresh_token: string;
}

export type GetTokenTarget = Target<GetTokenRequest, GetTokenResponse>;

async function getRefreshToken(
  ctx: Context,
  services: HandleTokenServices,
  params: GetTokenRequest
) {
  const clientId = params.get("client_id");
  const userPool = await services.cognito.getUserPoolForClientId(ctx, clientId);
  const userPoolClient = await services.cognito.getAppClient(ctx, clientId);
  const user = await userPool.getUserByRefreshToken(
    ctx,
    params.get("refresh_token")
  );
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

export const GetToken =
  (services: HandleTokenServices): GetTokenTarget =>
  async (ctx, req) => {
    const params = new URLSearchParams(req);
    switch (params.get("grant_type")) {
      case "authorization_code": {
        throw new NotImplementedError();
      }
      case "client_credentials": {
        throw new NotImplementedError();
      }
      case "refresh_token": {
        return getRefreshToken(ctx, services, params);
      }
      default: {
        throw new InvalidParameterError();
      }
    }
  };
