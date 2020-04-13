import {
  CodeMismatchError,
  ResourceNotFoundError,
  UserNotFoundError,
} from "../errors";
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
  triggers,
}: Services): ConfirmForgotPasswordTarget => async (body) => {
  const userPoolId = await userPool.getUserPoolIdForClientId(body.ClientId);
  if (!userPoolId) {
    throw new ResourceNotFoundError();
  }

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

  if (triggers.enabled("PostConfirmation")) {
    await triggers.postConfirmation({
      source: "PostConfirmation_ConfirmForgotPassword",
      username: user.Username,
      clientId: body.ClientId,
      userPoolId,
      userAttributes: user.Attributes,
    });
  }

  return {};
};
