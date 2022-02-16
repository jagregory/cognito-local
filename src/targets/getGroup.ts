import {
  GetGroupRequest,
  GetGroupResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { GroupNotFoundError } from "../errors";
import { Services } from "../services";
import { groupToResponseObject } from "./responses";
import { Target } from "./Target";

export type GetGroupTarget = Target<GetGroupRequest, GetGroupResponse>;

export const GetGroup =
  ({ cognito }: Pick<Services, "cognito">): GetGroupTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const group = await userPool.getGroupByGroupName(ctx, req.GroupName);
    if (!group) {
      throw new GroupNotFoundError();
    }

    return {
      Group: groupToResponseObject(req.UserPoolId)(group),
    };
  };
