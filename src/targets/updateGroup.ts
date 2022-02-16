import {
  UpdateGroupRequest,
  UpdateGroupResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";
import { GroupNotFoundError } from "../errors";
import { Target } from "./Target";

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
      Group: {
        CreationDate: updatedGroup.CreationDate,
        Description: updatedGroup.Description,
        GroupName: updatedGroup.GroupName,
        LastModifiedDate: updatedGroup.LastModifiedDate,
        Precedence: updatedGroup.Precedence,
        RoleArn: updatedGroup.RoleArn,
        UserPoolId: req.UserPoolId,
      },
    };
  };
