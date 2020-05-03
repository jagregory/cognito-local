import { Services } from "../services";

interface Input {
  ClientName: string;
  UserPoolId: string;
}

interface Output {
  UserPoolClient: {
    UserPoolId: string;
    ClientName: string;
    ClientId: string;
    LastModifiedDate: number;
    CreationDate: number;
    RefreshTokenValidity: number;
    AllowedOAuthFlowsUserPoolClient: boolean;
  };
}

export type CreateUserPoolClientTarget = (body: Input) => Promise<Output>;

export const CreateUserPoolClient = ({
  cognitoClient,
}: Services): CreateUserPoolClientTarget => async (body) => {
  const userPool = await cognitoClient.getUserPool(body.UserPoolId);
  const appClient = await userPool.createAppClient(body.ClientName);

  return {
    UserPoolClient: appClient,
  };
};
