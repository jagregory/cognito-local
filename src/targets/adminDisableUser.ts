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

type AdminDisableUserServices = Pick<
  Services,
  "cognito" | "clock" | "browserSessions"
>;

export const AdminDisableUser =
  ({
    cognito,
    clock,
    browserSessions,
  }: AdminDisableUserServices): AdminDisableUserTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const user = await userPool.getUserByUsername(ctx, req.Username);
    if (!user) {
      throw new UserNotFoundError();
    }

    const disable = async () => {
      const current = await userPool.getUserByUsername(ctx, user.Username);
      if (!current) throw new UserNotFoundError();
      // Persist revocation first: a failed write must not report disable success.
      await browserSessions?.revokeUser(req.UserPoolId, current.Username);
      await userPool.saveUser(ctx, {
        ...current,
        Enabled: false,
        UserLastModifiedDate: clock.get(),
      });
    };
    if (browserSessions)
      await browserSessions.withUser(req.UserPoolId, user.Username, disable);
    else await disable();

    return {};
  };
