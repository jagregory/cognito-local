import {
  ChangePasswordRequest,
  ChangePasswordResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { Services } from "../services";
import {
  InvalidParameterError,
  InvalidPasswordError,
  NotAuthorizedError,
} from "../errors";
import { Token } from "../services/tokenGenerator";
import { Target } from "./Target";

export type ChangePasswordTarget = Target<
  ChangePasswordRequest,
  ChangePasswordResponse
>;

type ChangePasswordServices = Pick<Services, "cognito" | "clock">;

export const ChangePassword =
  ({ cognito, clock }: ChangePasswordServices): ChangePasswordTarget =>
  async (ctx, req) => {
    const decodedToken = jwt.decode(req.AccessToken) as Token | null;
    if (!decodedToken) {
      ctx.logger.info("Unable to decode token");
      throw new InvalidParameterError();
    }

    const userPool = await cognito.getUserPoolForClientId(
      ctx,
      decodedToken.client_id
    );
    const user = await userPool.getUserByUsername(ctx, decodedToken.username);
    if (!user) {
      throw new NotAuthorizedError();
    }

    if (req.PreviousPassword !== user.Password) {
      throw new InvalidPasswordError();
    }

    await userPool.saveUser(ctx, {
      ...user,
      Password: req.ProposedPassword,
      UserLastModifiedDate: clock.get(),
    });

    return {};
  };
