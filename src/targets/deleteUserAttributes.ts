import type {
  DeleteUserAttributesRequest,
  DeleteUserAttributesResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { InvalidParameterError, NotAuthorizedError } from "../errors";
import type { Services } from "../services";
import { verifyToken } from "../services/tokenVerifier";
import { attributesRemove } from "../services/userPoolService";
import type { Target } from "./Target";

export type DeleteUserAttributesTarget = Target<
  DeleteUserAttributesRequest,
  DeleteUserAttributesResponse
>;

type DeleteUserAttributesServices = Pick<
  Services,
  "clock" | "cognito" | "config"
>;

export const DeleteUserAttributes =
  ({
    clock,
    cognito,
    config,
  }: DeleteUserAttributesServices): DeleteUserAttributesTarget =>
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
      throw new NotAuthorizedError();
    }

    const updatedUser = {
      ...user,
      Attributes: attributesRemove(user.Attributes, ...req.UserAttributeNames),
      UserLastModifiedDate: clock.get(),
    };

    await userPool.saveUser(ctx, updatedUser);

    return {};
  };
