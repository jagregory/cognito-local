import {
  AdminSetUserPasswordRequest,
  AdminSetUserPasswordResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { UserNotFoundError } from "../errors";
import { Services } from "../services";

export type AdminSetUserPasswordTarget = (
  req: AdminSetUserPasswordRequest
) => Promise<AdminSetUserPasswordResponse>;

type AdminSetUserPasswordServices = Pick<Services, "clock" | "cognito">;

export const AdminSetUserPassword =
  ({
    cognito,
    clock,
  }: AdminSetUserPasswordServices): AdminSetUserPasswordTarget =>
  async (req) => {
    const userPool = await cognito.getUserPool(req.UserPoolId);
    const user = await userPool.getUserByUsername(req.Username);
    if (!user) {
      throw new UserNotFoundError("User does not exist");
    }

    await userPool.saveUser({
      ...user,
      Password: req.Password,
      UserLastModifiedDate: clock.get(),
      UserStatus: req.Permanent ? "CONFIRMED" : "FORCE_CHANGE_PASSWORD",
    });

    return {};
  };
