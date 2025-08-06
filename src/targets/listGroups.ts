import type {
  ListGroupsRequest,
  ListGroupsResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import { groupToResponseObject } from "./responses";
import type { Target } from "./Target";

export type ListGroupsTarget = Target<ListGroupsRequest, ListGroupsResponse>;

type ListGroupServices = Pick<Services, "cognito">;

export const ListGroups =
  ({ cognito }: ListGroupServices): ListGroupsTarget =>
  async (ctx, req) => {
    // TODO: Limit support
    // TODO: PaginationToken support

    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const groups = await userPool.listGroups(ctx);

    return {
      Groups: groups.map(groupToResponseObject(req.UserPoolId)),
    };
  };
