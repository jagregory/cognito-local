import {
  ListGroupsRequest,
  ListGroupsResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";

export type ListGroupsTarget = (
  req: ListGroupsRequest
) => Promise<ListGroupsResponse>;

type ListGroupServices = Pick<Services, "cognitoClient">;

export const ListGroups = ({
  cognitoClient,
}: ListGroupServices): ListGroupsTarget => async (req) => {
  // TODO: Limit support
  // TODO: PaginationToken support

  const userPool = await cognitoClient.getUserPool(req.UserPoolId);
  const groups = await userPool.listGroups();

  return {
    Groups: groups.map((group) => ({
      CreationDate: new Date(group.CreationDate),
      Description: group.Description,
      GroupName: group.GroupName,
      LastModifiedDate: new Date(group.LastModifiedDate),
      Precedence: group.Precedence,
      RoleArn: group.RoleArn,
      UserPoolId: req.UserPoolId,
    })),
  };
};
