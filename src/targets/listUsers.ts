import {
  ListUsersRequest,
  ListUsersResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";

export type ListUsersTarget = (
  req: ListUsersRequest
) => Promise<ListUsersResponse>;

export const ListUsers = ({
  cognito,
}: Pick<Services, "cognito">): ListUsersTarget => async (req) => {
  const userPool = await cognito.getUserPool(req.UserPoolId);
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
