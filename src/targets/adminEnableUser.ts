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

type AdminEnableUserServices = Pick<
  Services,
  "cognito" | "clock" | "browserSessions"
>;

export const AdminEnableUser =
  ({
    cognito,
    clock,
    browserSessions,
  }: AdminEnableUserServices): AdminEnableUserTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const user = await userPool.getUserByUsername(ctx, req.Username);
    if (!user) {
      throw new UserNotFoundError();
    }

    const enable = async () => {
      const current = await userPool.getUserByUsername(ctx, user.Username);
      if (!current) throw new UserNotFoundError();
      await userPool.saveUser(ctx, {
        ...current,
        Enabled: true,
        UserLastModifiedDate: clock.get(),
      });
    };
    if (browserSessions)
      await browserSessions.withUser(req.UserPoolId, user.Username, enable);
    else await enable();

    return {};
  };
