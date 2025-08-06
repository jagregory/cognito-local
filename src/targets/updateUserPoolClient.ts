import type {
  UpdateUserPoolClientRequest,
  UpdateUserPoolClientResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { ResourceNotFoundError } from "../errors";
import type { Services } from "../services";
import type { AppClient } from "../services/appClient";
import { appClientToResponseObject } from "./responses";
import type { Target } from "./Target";

export type UpdateUserPoolClientTarget = Target<
  UpdateUserPoolClientRequest,
  UpdateUserPoolClientResponse
>;

type UpdateUserPoolClientServices = Pick<Services, "clock" | "cognito">;

export const UpdateUserPoolClient =
  ({
    clock,
    cognito,
  }: UpdateUserPoolClientServices): UpdateUserPoolClientTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const appClient = await cognito.getAppClient(ctx, req.ClientId);
    if (!appClient || appClient.UserPoolId !== req.UserPoolId) {
      throw new ResourceNotFoundError();
    }

    const updatedAppClient: AppClient = {
      ...appClient,
      AccessTokenValidity:
        req.AccessTokenValidity ?? appClient.AccessTokenValidity,
      AllowedOAuthFlows: req.AllowedOAuthFlows ?? appClient.AllowedOAuthFlows,
      AllowedOAuthFlowsUserPoolClient:
        req.AllowedOAuthFlowsUserPoolClient ??
        appClient.AllowedOAuthFlowsUserPoolClient,
      AllowedOAuthScopes:
        req.AllowedOAuthScopes ?? appClient.AllowedOAuthScopes,
      AnalyticsConfiguration:
        req.AnalyticsConfiguration ?? appClient.AnalyticsConfiguration,
      CallbackURLs: req.CallbackURLs ?? appClient.CallbackURLs,
      ClientName: req.ClientName ?? appClient.ClientName,
      DefaultRedirectURI:
        req.DefaultRedirectURI ?? appClient.DefaultRedirectURI,
      EnableTokenRevocation:
        req.EnableTokenRevocation ?? appClient.EnableTokenRevocation,
      ExplicitAuthFlows: req.ExplicitAuthFlows ?? appClient.ExplicitAuthFlows,
      IdTokenValidity: req.IdTokenValidity ?? appClient.IdTokenValidity,
      LastModifiedDate: clock.get(),
      LogoutURLs: req.LogoutURLs ?? appClient.LogoutURLs,
      PreventUserExistenceErrors:
        req.PreventUserExistenceErrors ?? appClient.PreventUserExistenceErrors,
      ReadAttributes: req.ReadAttributes ?? appClient.ReadAttributes,
      RefreshTokenValidity:
        req.RefreshTokenValidity ?? appClient.RefreshTokenValidity,
      SupportedIdentityProviders:
        req.SupportedIdentityProviders ?? appClient.SupportedIdentityProviders,
      TokenValidityUnits: {
        AccessToken:
          req.TokenValidityUnits?.AccessToken ??
          appClient.TokenValidityUnits?.AccessToken ??
          "hours",
        IdToken:
          req.TokenValidityUnits?.IdToken ??
          appClient.TokenValidityUnits?.IdToken ??
          "minutes",
        RefreshToken:
          req.TokenValidityUnits?.RefreshToken ??
          appClient.TokenValidityUnits?.RefreshToken ??
          "days",
      },
      WriteAttributes: req.WriteAttributes ?? appClient.WriteAttributes,
    };

    await userPool.saveAppClient(ctx, updatedAppClient);

    return {
      UserPoolClient: appClientToResponseObject(updatedAppClient),
    };
  };
