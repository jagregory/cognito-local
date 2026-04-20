import type {
  ListGroupsRequest,
  ListGroupsResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import { paginate } from "../services/pagination";
import { groupToResponseObject } from "./responses";
import type { Target } from "./Target";

export type ListGroupsTarget = Target<ListGroupsRequest, ListGroupsResponse>;

type ListGroupServices = Pick<Services, "cognito">;

export const ListGroups =
  ({ cognito }: ListGroupServices): ListGroupsTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const groups = await userPool.listGroups(ctx);

    const { items, nextToken } = paginate(groups, req.Limit, req.NextToken);

    return {
      Groups: items.map(groupToResponseObject(req.UserPoolId)),
      NextToken: nextToken,
    };
  };
