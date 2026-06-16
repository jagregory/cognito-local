import { ResourceNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

interface ListUserPoolClientSecretsRequest {
  UserPoolId: string;
  ClientId: string;
}
interface ListUserPoolClientSecretsResponse {
  ClientSecrets?: Array<{ ClientSecret?: string; CreatedDate?: Date }>;
}

export type ListUserPoolClientSecretsTarget = Target<
  ListUserPoolClientSecretsRequest,
  ListUserPoolClientSecretsResponse
>;

export const ListUserPoolClientSecrets =
  ({ cognito }: Pick<Services, "cognito">): ListUserPoolClientSecretsTarget =>
  async (ctx, req) => {
    await cognito.getUserPool(ctx, req.UserPoolId);
    const appClient = await cognito.getAppClient(ctx, req.ClientId);
    if (!appClient) {
      throw new ResourceNotFoundError("App client not found");
    }

    const secrets: Array<{ ClientSecret?: string; CreatedDate?: Date }> = [];
    if (appClient.ClientSecret) {
      secrets.push({
        ClientSecret: appClient.ClientSecret,
        CreatedDate: appClient.CreationDate,
      });
    }

    return { ClientSecrets: secrets };
  };
