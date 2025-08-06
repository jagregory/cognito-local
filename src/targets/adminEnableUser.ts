import type {
  AdminEnableUserRequest,
  AdminEnableUserResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { UserNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type AdminEnableUserTarget = Target<
  AdminEnableUserRequest,
  AdminEnableUserResponse
>;

type AdminEnableUserServices = Pick<Services, "cognito" | "clock">;

export const AdminEnableUser =
  ({ cognito, clock }: AdminEnableUserServices): AdminEnableUserTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const user = await userPool.getUserByUsername(ctx, req.Username);
    if (!user) {
      throw new UserNotFoundError();
    }

    await userPool.saveUser(ctx, {
      ...user,
      Enabled: true,
      UserLastModifiedDate: clock.get(),
    });

    return {};
  };
