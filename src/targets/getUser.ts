import type {
  GetUserRequest,
  GetUserResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import type { Services } from "../services";
import { verifyToken } from "../services/tokenVerifier";
import type { Target } from "./Target";

export type GetUserTarget = Target<GetUserRequest, GetUserResponse>;

export const GetUser =
  ({ cognito, config }: Pick<Services, "cognito" | "config">): GetUserTarget =>
  async (ctx, req) => {
    const decodedToken = (() => {
      try {
        return verifyToken(
          req.AccessToken,
          config.TokenConfig.VerifyTokens ?? false,
        );
      } catch {
        ctx.logger.info("Unable to verify token");
        throw new InvalidParameterError();
      }
    })();

    const userPool = await cognito.getUserPoolForClientId(
      ctx,
      decodedToken.client_id,
    );
    const user = await userPool.getUserByUsername(ctx, decodedToken.sub);
    if (!user) {
      throw new UserNotFoundError();
    }

    return {
      MFAOptions: user.MFAOptions,
      PreferredMfaSetting: user.PreferredMfaSetting,
      UserAttributes: user.Attributes,
      UserMFASettingList: user.UserMFASettingList,
      Username: user.Username,
    };
  };
