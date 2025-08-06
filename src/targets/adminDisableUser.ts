import type {
  AdminDisableUserRequest,
  AdminDisableUserResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { UserNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type AdminDisableUserTarget = Target<
  AdminDisableUserRequest,
  AdminDisableUserResponse
>;

type AdminDisableUserServices = Pick<Services, "cognito" | "clock">;

export const AdminDisableUser =
  ({ cognito, clock }: AdminDisableUserServices): AdminDisableUserTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const user = await userPool.getUserByUsername(ctx, req.Username);
    if (!user) {
      throw new UserNotFoundError();
    }

    await userPool.saveUser(ctx, {
      ...user,
      Enabled: false,
      UserLastModifiedDate: clock.get(),
    });

    return {};
  };
