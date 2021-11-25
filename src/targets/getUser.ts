import {
  GetUserRequest,
  GetUserResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import { Logger } from "../log";
import { Services } from "../services";
import { Token } from "../services/tokens";

export type GetUserTarget = (req: GetUserRequest) => Promise<GetUserResponse>;

export const GetUser = (
  { cognitoClient }: Pick<Services, "cognitoClient">,
  logger: Logger
): GetUserTarget => async (req) => {
  const decodedToken = jwt.decode(req.AccessToken) as Token | null;
  if (!decodedToken) {
    logger.info("Unable to decode token");
    throw new InvalidParameterError();
  }

  const userPool = await cognitoClient.getUserPoolForClientId(
    decodedToken.client_id
  );
  const user = await userPool.getUserByUsername(decodedToken.sub);
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
