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
  userPool,
}: Services): ConfirmSignUpTarget => async (body) => {
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
};
