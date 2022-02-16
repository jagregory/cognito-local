import {
  AdminListGroupsForUserRequest,
  AdminListGroupsForUserResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { UserNotFoundError } from "../errors";
import { Services } from "../services";
import { groupToResponseObject } from "./responses";
import { Target } from "./Target";

export type AdminListGroupsForUserTarget = Target<
  AdminListGroupsForUserRequest,
  AdminListGroupsForUserResponse
>;

type AdminListGroupsForUserServices = Pick<Services, "cognito">;

export const AdminListGroupsForUser =
  ({ cognito }: AdminListGroupsForUserServices): AdminListGroupsForUserTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const user = await userPool.getUserByUsername(ctx, req.Username);
    if (!user) {
      throw new UserNotFoundError();
    }

    const groups = await userPool.listGroups(ctx);
    const usersGroups = groups.filter((x) => x.members?.includes(req.Username));

    return {
      Groups: usersGroups.map(groupToResponseObject(req.UserPoolId)),
    };
  };
