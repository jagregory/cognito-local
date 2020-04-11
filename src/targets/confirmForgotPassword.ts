import { CodeMismatchError, UserNotFoundError } from "../errors";
import { Services } from "../services";

interface Input {
  ClientId: string;
  Username: string;
  ConfirmationCode: string;
  Password: string;
}

export type ConfirmForgotPasswordTarget = (body: Input) => Promise<{}>;

export const ConfirmForgotPassword = ({
  storage,
}: Services): ConfirmForgotPasswordTarget => async (body) => {
  const user = await storage.getUserByUsername(body.Username);

  if (!user) {
    throw new UserNotFoundError();
  }

  if (user.ConfirmationCode !== body.ConfirmationCode) {
    throw new CodeMismatchError();
  }

  await storage.saveUser({
    ...user,
    UserLastModifiedDate: new Date().getTime(),
    UserStatus: "CONFIRMED",
    ConfirmationCode: undefined,
    Password: body.Password,
  });

  return {};
};
