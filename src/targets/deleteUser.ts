import { DeleteUserRequest } from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { InvalidParameterError, NotAuthorizedError } from "../errors";
import { Services } from "../services";
import { Token } from "../services/tokens";
import { Target } from "./router";

export type DeleteUserTarget = Target<DeleteUserRequest, {}>;

type DeleteUserServices = Pick<Services, "cognito">;

export const DeleteUser =
  ({ cognito }: DeleteUserServices): DeleteUserTarget =>
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
    const user = await userPool.getUserByUsername(ctx, decodedToken.sub);
    if (!user) {
      throw new NotAuthorizedError();
    }

    await userPool.deleteUser(ctx, user);

    return {};
  };
