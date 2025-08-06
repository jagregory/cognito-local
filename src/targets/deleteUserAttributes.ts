import type {
  DeleteUserAttributesRequest,
  DeleteUserAttributesResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { InvalidParameterError, NotAuthorizedError } from "../errors";
import type { Services } from "../services";
import type { Token } from "../services/tokenGenerator";
import { attributesRemove } from "../services/userPoolService";
import type { Target } from "./Target";

export type DeleteUserAttributesTarget = Target<
  DeleteUserAttributesRequest,
  DeleteUserAttributesResponse
>;

type DeleteUserAttributesServices = Pick<Services, "clock" | "cognito">;

export const DeleteUserAttributes =
  ({
    clock,
    cognito,
  }: DeleteUserAttributesServices): DeleteUserAttributesTarget =>
  async (ctx, req) => {
    const decodedToken = jwt.decode(req.AccessToken) as Token | null;
    if (!decodedToken) {
      ctx.logger.info("Unable to decode token");
      throw new InvalidParameterError();
    }

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
