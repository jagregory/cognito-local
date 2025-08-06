import type {
  UpdateGroupRequest,
  UpdateGroupResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { GroupNotFoundError } from "../errors";
import type { Services } from "../services";
import { groupToResponseObject } from "./responses";
import type { Target } from "./Target";

export type UpdateGroupTarget = Target<UpdateGroupRequest, UpdateGroupResponse>;

type UpdateGroupServices = Pick<Services, "clock" | "cognito">;

export const UpdateGroup =
  ({ clock, cognito }: UpdateGroupServices): UpdateGroupTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const group = await userPool.getGroupByGroupName(ctx, req.GroupName);
    if (!group) {
      throw new GroupNotFoundError();
    }

    const updatedGroup = {
      ...group,
      Description: req.Description ?? group.Description,
      Precedence: req.Precedence ?? group.Precedence,
      RoleArn: req.RoleArn ?? group.RoleArn,
      LastModifiedDate: clock.get(),
    };

    await userPool.saveGroup(ctx, updatedGroup);

    return {
      Group: groupToResponseObject(req.UserPoolId)(updatedGroup),
    };
  };
