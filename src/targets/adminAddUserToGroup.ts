import { AdminAddUserToGroupRequest } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { GroupNotFoundError, UserNotFoundError } from "../errors";
import { Services } from "../services";
import { Group } from "../services/userPoolService";
import { Target } from "./Target";

export type AdminAddUserToGroupTarget = Target<AdminAddUserToGroupRequest, {}>;

type AdminAddUserToGroupServices = Pick<Services, "clock" | "cognito">;

export const AdminAddUserToGroup =
  ({
    clock,
    cognito,
  }: AdminAddUserToGroupServices): AdminAddUserToGroupTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);

    const group = await userPool.getGroupByGroupName(ctx, req.GroupName);
    if (!group) {
      throw new GroupNotFoundError();
    }

    const user = await userPool.getUserByUsername(ctx, req.Username);
    if (!user) {
      throw new UserNotFoundError();
    }

    const groupUsers = new Set(group.members ?? []);
    groupUsers.add(user.Username);

    const updatedGroup: Group = {
      ...group,
      LastModifiedDate: clock.get(),
      members: Array.from(groupUsers.values()),
    };

    await userPool.saveGroup(ctx, updatedGroup);

    return {};
  };
