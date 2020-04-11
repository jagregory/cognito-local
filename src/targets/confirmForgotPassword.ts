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
  userPool,
}: Services): ConfirmForgotPasswordTarget => async (body) => {
  const user = await userPool.getUserByUsername(body.Username);

  if (!user) {
    throw new UserNotFoundError();
  }

  if (user.ConfirmationCode !== body.ConfirmationCode) {
    throw new CodeMismatchError();
  }

  await userPool.saveUser({
    ...user,
    UserLastModifiedDate: new Date().getTime(),
    UserStatus: "CONFIRMED",
    ConfirmationCode: undefined,
    Password: body.Password,
  });

  return {};
};
