import {
  CreateUserPoolClientRequest,
  CreateUserPoolClientResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";

export type CreateUserPoolClientTarget = (
  req: CreateUserPoolClientRequest
) => Promise<CreateUserPoolClientResponse>;

export const CreateUserPoolClient = ({
  cognitoClient,
}: Pick<Services, "cognitoClient">): CreateUserPoolClientTarget => async (
  req
) => {
  const userPool = await cognitoClient.getUserPool(req.UserPoolId);
  const appClient = await userPool.createAppClient(req.ClientName);

  return {
    UserPoolClient: {
      ...appClient,
      CreationDate: new Date(appClient.CreationDate),
      LastModifiedDate: new Date(appClient.LastModifiedDate),
    },
  };
};
