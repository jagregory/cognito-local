import { ResourceNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

interface DeleteUserPoolClientSecretRequest {
  UserPoolId: string;
  ClientId: string;
  SecretId?: string;
}
interface DeleteUserPoolClientSecretResponse {}

export type DeleteUserPoolClientSecretTarget = Target<
  DeleteUserPoolClientSecretRequest,
  DeleteUserPoolClientSecretResponse
>;

export const DeleteUserPoolClientSecret =
  ({
    cognito,
  }: Pick<Services, "cognito">): DeleteUserPoolClientSecretTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const appClient = await cognito.getAppClient(ctx, req.ClientId);
    if (!appClient) {
      throw new ResourceNotFoundError("App client not found");
    }

    await userPool.saveAppClient(ctx, {
      ...appClient,
      ClientSecret: undefined,
    });

    return {};
  };
