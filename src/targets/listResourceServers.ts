import type {
  ListResourceServersRequest,
  ListResourceServersResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import { paginate } from "../services/pagination";
import type { Target } from "./Target";

export type ListResourceServersTarget = Target<
  ListResourceServersRequest,
  ListResourceServersResponse
>;

type ListResourceServersServices = Pick<Services, "cognito">;

export const ListResourceServers =
  ({ cognito }: ListResourceServersServices): ListResourceServersTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const servers: any[] =
      (userPool.options as any)._resourceServers ?? [];

    const { items, nextToken } = paginate(
      servers,
      req.MaxResults,
      req.NextToken,
    );

    return {
      ResourceServers: items,
      NextToken: nextToken,
    };
  };
