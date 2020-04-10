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
  storage,
}: Services): ConfirmSignUpTarget => async (body) => {
  const user = await storage.getUserByUsername(body.Username);

  if (!user) {
    throw new NotAuthorizedError();
  }

  if (user.ConfirmationCode !== body.ConfirmationCode) {
    throw new CodeMismatchError();
  }

  await storage.saveUser({
    ...user,
    UserStatus: "CONFIRMED",
    ConfirmationCode: undefined,
    UserLastModifiedDate: new Date().getTime(),
  });
};
