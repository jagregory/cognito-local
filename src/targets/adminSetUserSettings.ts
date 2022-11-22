import {
  AdminSetUserSettingsRequest,
  AdminSetUserSettingsResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { UserNotFoundError } from "../errors";
import { Services } from "../services";
import { Target } from "./Target";

export type AdminSetUserSettingsTarget = Target<
  AdminSetUserSettingsRequest,
  AdminSetUserSettingsResponse
>;

type AdminSetUserSettingsServices = Pick<Services, "cognito">;

export const AdminSetUserSettings =
  ({ cognito }: AdminSetUserSettingsServices): AdminSetUserSettingsTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const user = await userPool.getUserByUsername(ctx, req.Username);
    if (!user) {
      throw new UserNotFoundError("User does not exist");
    }

    await userPool.saveUser(ctx, {
      ...user,
      MFAOptions: req.MFAOptions,
    });

    return {};
  };
