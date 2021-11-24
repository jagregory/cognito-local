import {
  CreateGroupRequest,
  CreateGroupResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";
import { Group } from "../services/userPoolClient";

export type CreateGroupTarget = (
  body: CreateGroupRequest
) => Promise<CreateGroupResponse>;

type CreateGroupServices = Pick<Services, "clock" | "cognitoClient">;

export const CreateGroup = ({
  cognitoClient,
  clock,
}: CreateGroupServices): CreateGroupTarget => async (req) => {
  const userPool = await cognitoClient.getUserPool(req.UserPoolId);

  const now = clock.get().getTime();
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
      CreationDate: new Date(group.CreationDate),
      Description: group.Description,
      GroupName: group.GroupName,
      LastModifiedDate: new Date(group.LastModifiedDate),
      Precedence: group.Precedence,
      RoleArn: group.RoleArn,
      UserPoolId: req.UserPoolId,
    },
  };
};
