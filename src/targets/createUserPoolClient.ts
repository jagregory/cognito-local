import {
  CreateUserPoolClientRequest,
  CreateUserPoolClientResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";

export type CreateUserPoolClientTarget = (
  req: CreateUserPoolClientRequest
) => Promise<CreateUserPoolClientResponse>;

export const CreateUserPoolClient =
  ({ cognito }: Pick<Services, "cognito">): CreateUserPoolClientTarget =>
  async (req) => {
    const userPool = await cognito.getUserPool(req.UserPoolId);
    const appClient = await userPool.createAppClient(req.ClientName);

    return {
      UserPoolClient: {
        ...appClient,
        CreationDate: appClient.CreationDate,
        LastModifiedDate: appClient.LastModifiedDate,
      },
    };
  };
