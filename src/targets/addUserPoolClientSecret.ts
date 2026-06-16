import * as crypto from "node:crypto";
import { ResourceNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

interface AddUserPoolClientSecretRequest {
  UserPoolId: string;
  ClientId: string;
}
interface AddUserPoolClientSecretResponse {
  ClientSecret?: string;
  ClientId?: string;
}

export type AddUserPoolClientSecretTarget = Target<
  AddUserPoolClientSecretRequest,
  AddUserPoolClientSecretResponse
>;

export const AddUserPoolClientSecret =
  ({ cognito }: Pick<Services, "cognito">): AddUserPoolClientSecretTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const appClient = await cognito.getAppClient(ctx, req.ClientId);
    if (!appClient) {
      throw new ResourceNotFoundError("App client not found");
    }

    const secret = crypto.randomBytes(32).toString("base64");

    await userPool.saveAppClient(ctx, {
      ...appClient,
      ClientSecret: secret,
    });

    return {
      ClientSecret: secret,
      ClientId: req.ClientId,
    };
  };
