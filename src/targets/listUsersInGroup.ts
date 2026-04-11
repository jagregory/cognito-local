import type {
  ListUsersInGroupRequest,
  ListUsersInGroupResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { GroupNotFoundError, UserNotFoundError } from "../errors";
import type { Services } from "../services";
import { paginate } from "../services/pagination";
import { userToResponseObject } from "./responses";
import type { Target } from "./Target";

export type ListUsersInGroupTarget = Target<
  ListUsersInGroupRequest,
  ListUsersInGroupResponse
>;

export const ListUsersInGroup =
  ({ cognito }: Pick<Services, "cognito">): ListUsersInGroupTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const group = await userPool.getGroupByGroupName(ctx, req.GroupName);
    if (!group) {
      throw new GroupNotFoundError();
    }

    const allUsers = await Promise.all(
      group?.members?.map(async (username) => {
        const user = await userPool.getUserByUsername(ctx, username);
        if (!user) {
          throw new UserNotFoundError();
        }
        return userToResponseObject(user);
      }) ?? [],
    );

    const { items, nextToken } = paginate(allUsers, req.Limit, req.NextToken);

    return {
      Users: items,
      NextToken: nextToken,
    };
  };
