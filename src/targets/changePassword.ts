import jwt from "jsonwebtoken";
import { Services } from "../services";
import { NotAuthorizedError } from "../errors";

interface Input {
  AccessToken: string;
  PreviousPassword: string;
  ProposedPassword: string;
}

export type ChangePasswordTarget = (body: Input) => Promise<object | null>;

export const ChangePassword =
  ({ cognitoClient }: Services): ChangePasswordTarget =>
  async (body) => {
    const { AccessToken, PreviousPassword, ProposedPassword } = body || {};
    const claims = jwt.decode(AccessToken) as any;
    const userPool = await cognitoClient.getUserPoolForClientId(
      claims.client_id
    );
    const user = await userPool.getUserByUsername(claims.username);
    if (!user) {
      throw new NotAuthorizedError();
    }
    // TODO: Should check previous password.
    await userPool.saveUser({
      ...user,
      Password: ProposedPassword,
      UserLastModifiedDate: Math.floor(new Date().getTime() / 1000),
    });
    // TODO: Should possibly return something?
    return {};
  };
