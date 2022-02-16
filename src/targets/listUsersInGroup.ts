import {
  ListUsersInGroupRequest,
  ListUsersInGroupResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { GroupNotFoundError, UserNotFoundError } from "../errors";
import { Services } from "../services";
import { Target } from "./Target";

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

    return {
      Users: await Promise.all(
        group?.members?.map(async (username) => {
          const user = await userPool.getUserByUsername(ctx, username);
          if (!user) {
            throw new UserNotFoundError();
          }

          return {
            Username: user.Username,
            Attributes: user.Attributes,
            UserCreateDate: user.UserCreateDate,
            UserLastModifiedDate: user.UserLastModifiedDate,
            Enabled: user.Enabled,
            UserStatus: user.UserStatus,
            MFAOptions: user.MFAOptions,
          };
        }) ?? []
      ),
    };
  };
