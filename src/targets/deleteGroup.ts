import type { DeleteGroupRequest } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { GroupNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type DeleteGroupTarget = Target<DeleteGroupRequest, object>;

type DeleteGroupServices = Pick<Services, "cognito">;

export const DeleteGroup =
  ({ cognito }: DeleteGroupServices): DeleteGroupTarget =>
  async (ctx, req) => {
    // TODO: from the docs "Calling this action requires developer credentials.", can we enforce this?

    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const group = await userPool.getGroupByGroupName(ctx, req.GroupName);
    if (!group) {
      throw new GroupNotFoundError();
    }

    await userPool.deleteGroup(ctx, group);

    return {};
  };
