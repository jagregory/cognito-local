import jwt from "jsonwebtoken";
import { Services } from "../services";
import { Token } from "../services/tokens";
import { MFAOption, UserAttribute } from "../services/userPoolClient";

interface Input {
  AccessToken: string;
}

interface Output {
  Username: string;
  UserCreateDate: number;
  UserLastModifiedDate: number;
  Enabled: boolean;
  UserStatus: "CONFIRMED" | "UNCONFIRMED" | "RESET_REQUIRED";
  UserAttributes: readonly UserAttribute[];
  MFAOptions?: readonly MFAOption[];
}

export type GetUserTarget = (body: Input) => Promise<Output | null>;

export const GetUser = ({ cognitoClient }: Services): GetUserTarget => async (
  body
) => {
  const { sub, client_id } = jwt.decode(body.AccessToken) as Token;
  if (sub && client_id) {
    const userPool = await cognitoClient.getUserPoolForClientId(client_id);
    const user = await userPool.getUserByUsername(sub);

    return user
      ? {
          Username: user.Username,
          UserCreateDate: user.UserCreateDate,
          UserLastModifiedDate: user.UserLastModifiedDate,
          Enabled: user.Enabled,
          UserStatus: user.UserStatus,
          UserAttributes: user.Attributes,
          MFAOptions: user?.MFAOptions,
        }
      : null;
  }
  return null;
};
