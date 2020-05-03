import shortUUID from "short-uuid";

export interface AppClient {
  UserPoolId: string;
  ClientName: string;
  ClientId: string;
  LastModifiedDate: number;
  CreationDate: number;
  RefreshTokenValidity: number;
  AllowedOAuthFlowsUserPoolClient: boolean;
}

const generator = shortUUID("0123456789abcdefghijklmnopqrstuvwxyz");

export const newId = generator.new;
