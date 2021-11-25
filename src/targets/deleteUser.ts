import { DeleteUserRequest } from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { InvalidParameterError, NotAuthorizedError } from "../errors";
import { Logger } from "../log";
import { Services } from "../services";
import { Token } from "../services/tokens";

export type DeleteUserTarget = (req: DeleteUserRequest) => Promise<{}>;

type DeleteUserServices = Pick<Services, "cognitoClient">;

export const DeleteUser = (
  { cognitoClient }: DeleteUserServices,
  logger: Logger
): DeleteUserTarget => async (req) => {
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
    throw new NotAuthorizedError();
  }

  await userPool.deleteUser(user);

  return {};
};
