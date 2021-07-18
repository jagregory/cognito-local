import { CodeMismatchError, NotAuthorizedError } from "../errors";
import { Services } from "../services";

interface Input {
  ClientId: string;
  Username: string;
  ConfirmationCode: string;
  ForceAliasCreation: boolean;
}

export type ConfirmSignUpTarget = (body: Input) => Promise<void>;

export const ConfirmSignUp = ({
  cognitoClient,
  triggers,
}: Pick<Services, "cognitoClient" | "triggers">): ConfirmSignUpTarget => async (
  body
) => {
  const userPool = await cognitoClient.getUserPoolForClientId(body.ClientId);
  const user = await userPool.getUserByUsername(body.Username);

  if (!user) {
    throw new NotAuthorizedError();
  }

  if (user.ConfirmationCode !== body.ConfirmationCode) {
    throw new CodeMismatchError();
  }

  await userPool.saveUser({
    ...user,
    UserStatus: "CONFIRMED",
    ConfirmationCode: undefined,
    UserLastModifiedDate: new Date().getTime(),
  });

  if (triggers.enabled("PostConfirmation")) {
    await triggers.postConfirmation({
      source: "PostConfirmation_ConfirmSignUp",
      username: user.Username,
      clientId: body.ClientId,
      userPoolId: userPool.config.Id,
      userAttributes: user.Attributes,
    });
  }
};
