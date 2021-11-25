import {
  AdminSetUserPasswordRequest,
  AdminSetUserPasswordResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { UserNotFoundError } from "../errors";
import { Services } from "../services";

export type AdminSetUserPasswordTarget = (
  req: AdminSetUserPasswordRequest
) => Promise<AdminSetUserPasswordResponse>;

type AdminSetUserPasswordServices = Pick<Services, "clock" | "cognitoClient">;

export const AdminSetUserPassword = ({
  cognitoClient,
  clock,
}: AdminSetUserPasswordServices): AdminSetUserPasswordTarget => async (req) => {
  const userPool = await cognitoClient.getUserPool(req.UserPoolId);
  const user = await userPool.getUserByUsername(req.Username);
  if (!user) {
    throw new UserNotFoundError("User does not exist");
  }

  await userPool.saveUser({
    ...user,
    Password: req.Password,
    UserLastModifiedDate: clock.get().getTime(),
    UserStatus: req.Permanent ? "CONFIRMED" : "FORCE_CHANGE_PASSWORD",
  });

  return {};
};
