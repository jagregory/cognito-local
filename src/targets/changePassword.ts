import {
  ChangePasswordRequest,
  ChangePasswordResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { Services } from "../services";
import { NotAuthorizedError } from "../errors";
import { Target } from "./router";

export type ChangePasswordTarget = Target<
  ChangePasswordRequest,
  ChangePasswordResponse
>;

export const ChangePassword =
  ({ cognito, clock }: Services): ChangePasswordTarget =>
  async (ctx, req) => {
    const claims = jwt.decode(req.AccessToken) as any;
    const userPool = await cognito.getUserPoolForClientId(
      ctx,
      claims.client_id
    );
    const user = await userPool.getUserByUsername(ctx, claims.username);
    if (!user) {
      throw new NotAuthorizedError();
    }
    // TODO: Should check previous password.
    await userPool.saveUser(ctx, {
      ...user,
      Password: req.ProposedPassword,
      UserLastModifiedDate: clock.get(),
    });

    return {};
  };
