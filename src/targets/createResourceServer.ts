import type {
  CreateResourceServerRequest,
  CreateResourceServerResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import type { Target } from "./Target";

export type CreateResourceServerTarget = Target<
  CreateResourceServerRequest,
  CreateResourceServerResponse
>;

interface ResourceServerData {
  UserPoolId: string;
  Identifier: string;
  Name: string;
  Scopes?: Array<{ ScopeName: string; ScopeDescription: string }>;
}

type CreateResourceServerServices = Pick<Services, "cognito">;

export const CreateResourceServer =
  ({ cognito }: CreateResourceServerServices): CreateResourceServerTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);

    const server: ResourceServerData = {
      UserPoolId: req.UserPoolId,
      Identifier: req.Identifier,
      Name: req.Name,
      Scopes: req.Scopes as any,
    };

    const servers: ResourceServerData[] =
      (userPool.options as any)._resourceServers ?? [];
    servers.push(server);

    await userPool.updateOptions(ctx, {
      ...userPool.options,
      _resourceServers: servers,
    } as any);

    return {
      ResourceServer: server as any,
    };
  };
