import {
  ListGroupsRequest,
  ListGroupsResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";

export type ListGroupsTarget = (
  req: ListGroupsRequest
) => Promise<ListGroupsResponse>;

type ListGroupServices = Pick<Services, "cognito">;

export const ListGroups =
  ({ cognito }: ListGroupServices): ListGroupsTarget =>
  async (req) => {
    // TODO: Limit support
    // TODO: PaginationToken support

    const userPool = await cognito.getUserPool(req.UserPoolId);
    const groups = await userPool.listGroups();

    return {
      Groups: groups.map((group) => ({
        CreationDate: group.CreationDate,
        Description: group.Description,
        GroupName: group.GroupName,
        LastModifiedDate: group.LastModifiedDate,
        Precedence: group.Precedence,
        RoleArn: group.RoleArn,
        UserPoolId: req.UserPoolId,
      })),
    };
  };
