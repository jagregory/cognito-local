import {
  CreateUserPoolClientRequest,
  CreateUserPoolClientResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";
import { Target } from "./Target";

export type CreateUserPoolClientTarget = Target<
  CreateUserPoolClientRequest,
  CreateUserPoolClientResponse
>;

export const CreateUserPoolClient =
  ({ cognito }: Pick<Services, "cognito">): CreateUserPoolClientTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const appClient = await userPool.createAppClient(ctx, req.ClientName);

    return {
      UserPoolClient: {
        ...appClient,
        CreationDate: appClient.CreationDate,
        LastModifiedDate: appClient.LastModifiedDate,
      },
    };
  };
