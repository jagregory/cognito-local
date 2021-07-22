import { ResourceNotFoundError } from "../errors";
import { Services } from "../services";
import { UserAttribute } from "../services/userPoolClient";

interface Input {
  ClientId: string;
  UserPoolId: string;
}

export interface DynamoDBUserRecord {
  Username: string;
  UserCreateDate: number;
  UserLastModifiedDate: number;
  Enabled: boolean;
  UserStatus: "CONFIRMED" | "UNCONFIRMED" | "RESET_REQUIRED";
  Attributes: readonly UserAttribute[];
}

interface Output {
  UserPoolClient: {
    AccessTokenValidity?: number;
    AllowedOAuthFlows?: ("code" | "implicit" | "client_credentials")[];
    AllowedOAuthFlowsUserPoolClient?: boolean;
    AllowedOAuthScopes?: string[];
    AnalyticsConfiguration?: {
      ApplicationArn?: string;
      ApplicationId?: string;
      ExternalId?: string;
      RoleArn?: string;
      UserDataShared?: boolean;
    };
    CallbackURLs?: string[];
    ClientId?: string;
    ClientName?: string;
    ClientSecret?: string;
    CreationDate?: number;
    DefaultRedirectURI?: string;
    EnableTokenRevocation?: boolean;
    ExplicitAuthFlows?: string[];
    IdTokenValidity?: number;
    LastModifiedDate?: number;
    LogoutURLs?: string[];
    PreventUserExistenceErrors?: "LEGACY" | "ENABLED";
    ReadAttributes?: string[];
    RefreshTokenValidity?: number;
    SupportedIdentityProviders?: string[];
    TokenValidityUnits?: {
      AccessToken?: "seconds" | "minutes" | "hours" | "days";
      IdToken?: "seconds" | "minutes" | "hours" | "days";
      RefreshToken?: "seconds" | "minutes" | "hours" | "days";
    };
    UserPoolId?: string;
    WriteAttributes?: string[];
  };
}

export type DescribeUserPoolClientTarget = (body: Input) => Promise<Output>;

export const DescribeUserPoolClient = ({
  cognitoClient,
}: Pick<Services, "cognitoClient">): DescribeUserPoolClientTarget => async (
  body
) => {
  const client = await cognitoClient.getAppClient(body.ClientId);
  if (client?.UserPoolId !== body.UserPoolId) {
    throw new ResourceNotFoundError();
  }

  return {
    UserPoolClient: client,
  };
};
