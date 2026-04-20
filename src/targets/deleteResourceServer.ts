import type { DeleteResourceServerRequest } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { ResourceNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type DeleteResourceServerTarget = Target<
  DeleteResourceServerRequest,
  {}
>;

type DeleteResourceServerServices = Pick<Services, "cognito">;

export const DeleteResourceServer =
  ({ cognito }: DeleteResourceServerServices): DeleteResourceServerTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const servers: any[] =
      (userPool.options as any)._resourceServers ?? [];

    const index = servers.findIndex((s) => s.Identifier === req.Identifier);
    if (index === -1) {
      throw new ResourceNotFoundError("Resource server not found.");
    }

    servers.splice(index, 1);

    await userPool.updateOptions(ctx, {
      ...userPool.options,
      _resourceServers: servers,
    } as any);

    return {};
  };
