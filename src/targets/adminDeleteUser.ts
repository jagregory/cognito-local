import type { AdminDeleteUserRequest } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { UserNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type AdminDeleteUserTarget = Target<AdminDeleteUserRequest, object>;

type AdminDeleteUserServices = Pick<Services, "cognito">;

export const AdminDeleteUser =
  ({ cognito }: AdminDeleteUserServices): AdminDeleteUserTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const user = await userPool.getUserByUsername(ctx, req.Username);
    if (!user) {
      throw new UserNotFoundError("User does not exist");
    }

    await userPool.deleteUser(ctx, user);

    return {};
  };
