import type {
  CreateUserPoolClientRequest,
  CreateUserPoolClientResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import { type AppClient, newId } from "../services/appClient";
import { appClientToResponseObject } from "./responses";
import type { Target } from "./Target";

export type CreateUserPoolClientTarget = Target<
  CreateUserPoolClientRequest,
  CreateUserPoolClientResponse
>;

type CreateUserPoolClientServices = Pick<Services, "clock" | "cognito">;

export const CreateUserPoolClient =
  ({
    clock,
    cognito,
  }: CreateUserPoolClientServices): CreateUserPoolClientTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);

    const appClient: AppClient = {
      AccessTokenValidity: req.AccessTokenValidity,
      AllowedOAuthFlows: req.AllowedOAuthFlows,
      AllowedOAuthFlowsUserPoolClient: req.AllowedOAuthFlowsUserPoolClient,
      AllowedOAuthScopes: req.AllowedOAuthScopes,
      AnalyticsConfiguration: req.AnalyticsConfiguration,
      CallbackURLs: req.CallbackURLs,
      ClientId: newId(),
      ClientName: req.ClientName,
      ClientSecret: req.GenerateSecret ? newId() : undefined,
      CreationDate: clock.get(),
      DefaultRedirectURI: req.DefaultRedirectURI,
      EnableTokenRevocation: req.EnableTokenRevocation,
      ExplicitAuthFlows: req.ExplicitAuthFlows,
      IdTokenValidity: req.IdTokenValidity,
      LastModifiedDate: clock.get(),
      LogoutURLs: req.LogoutURLs,
      PreventUserExistenceErrors: req.PreventUserExistenceErrors,
      ReadAttributes: req.ReadAttributes,
      RefreshTokenValidity: req.RefreshTokenValidity,
      SupportedIdentityProviders: req.SupportedIdentityProviders,
      TokenValidityUnits: {
        AccessToken: req.TokenValidityUnits?.AccessToken ?? "hours",
        IdToken: req.TokenValidityUnits?.IdToken ?? "minutes",
        RefreshToken: req.TokenValidityUnits?.RefreshToken ?? "days",
      },
      UserPoolId: req.UserPoolId,
      WriteAttributes: req.WriteAttributes,
    };

    await userPool.saveAppClient(ctx, appClient);

    return {
      UserPoolClient: appClientToResponseObject(appClient),
    };
  };
