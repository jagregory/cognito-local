import { CodeMismatchError, NotAuthorizedError } from "../errors";
import { Services } from "../services";
import { generateTokens } from "../services/tokens";

interface Input {
  ChallengeName: "SMS_MFA";
  ChallengeResponses: {
    USERNAME: string;
    SMS_MFA_CODE: string;
  };
  ClientId: string;
  Session: string | null;
}

interface Output {
  ChallengeName: string;
  ChallengeParameters: {};
  AuthenticationResult: {
    IdToken: string;
    AccessToken: string;
    RefreshToken: string;
  };
  Session: string | null;
}

export type RespondToAuthChallengeTarget = (body: Input) => Promise<Output>;

export const RespondToAuthChallenge = ({
  cognitoClient,
}: Pick<Services, "cognitoClient">): RespondToAuthChallengeTarget => async (
  body
) => {
  const userPool = await cognitoClient.getUserPoolForClientId(body.ClientId);
  const user = await userPool.getUserByUsername(
    body.ChallengeResponses.USERNAME
  );
  if (!user) {
    throw new NotAuthorizedError();
  }

  if (user.MFACode !== body.ChallengeResponses.SMS_MFA_CODE) {
    throw new CodeMismatchError();
  }

  await userPool.saveUser({
    ...user,
    MFACode: undefined,
  });

  return {
    ChallengeName: body.ChallengeName,
    ChallengeParameters: {},
    AuthenticationResult: generateTokens(
      user,
      body.ClientId,
      userPool.config.Id
    ),
    Session: body.Session,
  };
};
