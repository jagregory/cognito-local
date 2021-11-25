import {
  RespondToAuthChallengeRequest,
  RespondToAuthChallengeResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import {
  CodeMismatchError,
  InvalidParameterError,
  NotAuthorizedError,
  UnsupportedError,
} from "../errors";
import { Services } from "../services";
import { generateTokens } from "../services/tokens";

export type RespondToAuthChallengeTarget = (
  req: RespondToAuthChallengeRequest
) => Promise<RespondToAuthChallengeResponse>;

export const RespondToAuthChallenge = ({
  cognitoClient,
  clock,
}: Pick<
  Services,
  "cognitoClient" | "clock"
>): RespondToAuthChallengeTarget => async (req) => {
  if (!req.ChallengeResponses) {
    throw new InvalidParameterError(
      "Missing required parameter challenge responses"
    );
  }

  const userPool = await cognitoClient.getUserPoolForClientId(req.ClientId);
  const user = await userPool.getUserByUsername(
    req.ChallengeResponses.USERNAME
  );
  if (!user) {
    throw new NotAuthorizedError();
  }

  if (user.MFACode !== req.ChallengeResponses.SMS_MFA_CODE) {
    throw new CodeMismatchError();
  }

  await userPool.saveUser({
    ...user,
    MFACode: undefined,
  });

  return {
    ChallengeName: req.ChallengeName,
    ChallengeParameters: {},
    AuthenticationResult: await generateTokens(
      user,
      req.ClientId,
      userPool.config.Id,
      clock
    ),
    Session: req.Session,
  };
};
