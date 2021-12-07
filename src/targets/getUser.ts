import {
  GetUserRequest,
  GetUserResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import { Services } from "../services";
import { Token } from "../services/tokenGenerator";
import { Target } from "./router";

export type GetUserTarget = Target<GetUserRequest, GetUserResponse>;

export const GetUser =
  ({ cognito }: Pick<Services, "cognito">): GetUserTarget =>
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
      throw new UserNotFoundError();
    }

    const output: GetUserResponse = {
      Username: user.Username,
      UserAttributes: user.Attributes,
    };

    if (user.MFAOptions) {
      output.MFAOptions = user.MFAOptions;
    }

    return output;
  };
