import {
  ListUsersRequest,
  ListUsersResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";

export type ListUsersTarget = (
  req: ListUsersRequest
) => Promise<ListUsersResponse>;

export const ListUsers = ({
  cognitoClient,
}: Pick<Services, "cognitoClient">): ListUsersTarget => async (req) => {
  const userPool = await cognitoClient.getUserPool(req.UserPoolId);
  const users = await userPool.listUsers();

  // TODO: support AttributesToGet
  // TODO: support Filter
  // TODO: support Limit
  // TODO: support PaginationToken

  return {
    Users: users.map((user) => ({
      Username: user.Username,
      UserCreateDate: new Date(user.UserCreateDate),
      UserLastModifiedDate: new Date(user.UserLastModifiedDate),
      Enabled: user.Enabled,
      UserStatus: user.UserStatus,
      Attributes: user.Attributes,
    })),
  };
};
