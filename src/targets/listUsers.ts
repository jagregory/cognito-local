import type {
  ListUsersRequest,
  ListUsersResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import { paginate } from "../services/pagination";
import { userToResponseObject } from "./responses";
import type { Target } from "./Target";

export type ListUsersTarget = Target<ListUsersRequest, ListUsersResponse>;

export const ListUsers =
  ({ cognito }: Pick<Services, "cognito">): ListUsersTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const users = await userPool.listUsers(ctx, req.Filter);

    const { items, nextToken } = paginate(
      users,
      req.Limit,
      req.PaginationToken,
    );

    return {
      Users: items.map(userToResponseObject),
      PaginationToken: nextToken,
    };
  };
