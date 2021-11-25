import {
  ChangePasswordRequest,
  ChangePasswordResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { Services } from "../services";
import { NotAuthorizedError } from "../errors";

export type ChangePasswordTarget = (
  req: ChangePasswordRequest
) => Promise<ChangePasswordResponse>;

export const ChangePassword = ({
  cognito,
  clock,
}: Services): ChangePasswordTarget => async (req) => {
  const claims = jwt.decode(req.AccessToken) as any;
  const userPool = await cognito.getUserPoolForClientId(claims.client_id);
  const user = await userPool.getUserByUsername(claims.username);
  if (!user) {
    throw new NotAuthorizedError();
  }
  // TODO: Should check previous password.
  await userPool.saveUser({
    ...user,
    Password: req.ProposedPassword,
    UserLastModifiedDate: clock.get().getTime(),
  });
  // TODO: Should possibly return something?
  return {};
};
