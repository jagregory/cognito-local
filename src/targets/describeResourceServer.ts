import type {
  DescribeResourceServerRequest,
  DescribeResourceServerResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { ResourceNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type DescribeResourceServerTarget = Target<
  DescribeResourceServerRequest,
  DescribeResourceServerResponse
>;

type DescribeResourceServerServices = Pick<Services, "cognito">;

export const DescribeResourceServer =
  ({
    cognito,
  }: DescribeResourceServerServices): DescribeResourceServerTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const servers: any[] =
      (userPool.options as any)._resourceServers ?? [];

    const server = servers.find((s) => s.Identifier === req.Identifier);
    if (!server) {
      throw new ResourceNotFoundError("Resource server not found.");
    }

    return {
      ResourceServer: server,
    };
  };
