import { CodeMismatchError, UserNotFoundError } from "../errors";
import { Services } from "../services";

interface Input {
  ClientId: string;
  Username: string;
  ConfirmationCode: string;
  Password: string;
}

export type ConfirmForgotPasswordTarget = (body: Input) => Promise<{}>;

export const ConfirmForgotPassword =
  ({
    cognitoClient,
    triggers,
  }: Pick<
    Services,
    "cognitoClient" | "triggers"
  >): ConfirmForgotPasswordTarget =>
  async (body) => {
    const userPool = await cognitoClient.getUserPoolForClientId(body.ClientId);
    const user = await userPool.getUserByUsername(body.Username);
    if (!user) {
      throw new UserNotFoundError();
    }

    if (user.ConfirmationCode !== body.ConfirmationCode) {
      throw new CodeMismatchError();
    }

    await userPool.saveUser({
      ...user,
      UserLastModifiedDate: Math.floor(new Date().getTime() / 1000),
      UserStatus: "CONFIRMED",
      ConfirmationCode: undefined,
      Password: body.Password,
    });

    if (triggers.enabled("PostConfirmation")) {
      await triggers.postConfirmation({
        source: "PostConfirmation_ConfirmForgotPassword",
        username: user.Username,
        clientId: body.ClientId,
        userPoolId: userPool.config.Id,
        userAttributes: user.Attributes,
      });
    }

    return {};
  };
