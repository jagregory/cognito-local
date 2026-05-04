import type {
  GlobalSignOutRequest,
  GlobalSignOutResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Token } from "../services/tokenGenerator";
import type { Target } from "./Target";

export type GlobalSignOutTarget = Target<
  GlobalSignOutRequest,
  GlobalSignOutResponse
>;

type GlobalSignOutServices = Pick<Services, "cognito" | "clock">;

export const GlobalSignOut =
  ({ cognito, clock }: GlobalSignOutServices): GlobalSignOutTarget =>
  async (ctx, req) => {
    const decodedToken = jwt.decode(req.AccessToken) as Token | null;
    if (!decodedToken) {
      throw new InvalidParameterError();
    }

    const userPool = await cognito.getUserPoolForClientId(
      ctx,
      decodedToken.client_id,
    );
    const user = await userPool.getUserByUsername(ctx, decodedToken.sub);
    if (!user) {
      throw new UserNotFoundError();
    }

    await userPool.saveUser(ctx, {
      ...user,
      RefreshTokens: [],
      UserLastModifiedDate: clock.get(),
    });

    return {};
  };
