import {
  CreateGroupRequest,
  CreateGroupResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";
import { Group } from "../services/userPoolService";
import { Target } from "../server/Router";

export type CreateGroupTarget = Target<CreateGroupRequest, CreateGroupResponse>;

type CreateGroupServices = Pick<Services, "clock" | "cognito">;

export const CreateGroup =
  ({ cognito, clock }: CreateGroupServices): CreateGroupTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);

    const now = clock.get();
    const group: Group = {
      CreationDate: now,
      Description: req.Description,
      GroupName: req.GroupName,
      LastModifiedDate: now,
      Precedence: req.Precedence,
      RoleArn: req.RoleArn,
    };

    await userPool.saveGroup(ctx, group);

    return {
      Group: {
        CreationDate: group.CreationDate,
        Description: group.Description,
        GroupName: group.GroupName,
        LastModifiedDate: group.LastModifiedDate,
        Precedence: group.Precedence,
        RoleArn: group.RoleArn,
        UserPoolId: req.UserPoolId,
      },
    };
  };
