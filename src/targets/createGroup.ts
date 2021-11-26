import {
  CreateGroupRequest,
  CreateGroupResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";
import { Group } from "../services/userPoolService";

export type CreateGroupTarget = (
  req: CreateGroupRequest
) => Promise<CreateGroupResponse>;

type CreateGroupServices = Pick<Services, "clock" | "cognito">;

export const CreateGroup = ({
  cognito,
  clock,
}: CreateGroupServices): CreateGroupTarget => async (req) => {
  const userPool = await cognito.getUserPool(req.UserPoolId);

  const now = clock.get();
  const group: Group = {
    CreationDate: now,
    Description: req.Description,
    GroupName: req.GroupName,
    LastModifiedDate: now,
    Precedence: req.Precedence,
    RoleArn: req.RoleArn,
  };

  await userPool.saveGroup(group);

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
