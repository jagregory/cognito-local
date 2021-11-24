import uuid from "uuid";
import { Services } from "../services";
import { attributesInclude, User } from "../services/userPoolClient";

interface Input {
  UserPoolId: string;
  Username: string;
  TemporaryPassword: string;
  MessageAction?: string;
  UserAttributes?: any;
  DesiredDeliveryMediums?: any;
}

interface Output {
  User: User;
}

export type AdminCreateUserTarget = (body: Input) => Promise<User | null>;

export const AdminCreateUser = ({
  cognitoClient,
}: Services): AdminCreateUserTarget => async (body) => {
  const { UserPoolId, Username, TemporaryPassword, UserAttributes } =
    body || {};
  const userPool = await cognitoClient.getUserPool(UserPoolId);

  const attributes = attributesInclude("sub", UserAttributes)
    ? UserAttributes
    : [{ Name: "sub", Value: uuid.v4() }, ...UserAttributes];

  const user: User = {
    Username,
    Password: TemporaryPassword,
    Attributes: attributes,
    Enabled: true,
    UserStatus: "CONFIRMED",
    ConfirmationCode: undefined,
    UserCreateDate: Math.floor(new Date().getTime() / 1000),
    UserLastModifiedDate: Math.floor(new Date().getTime() / 1000),
  };
  await userPool.saveUser(user);
  // TODO: Shuldn't return password.
  return user;
};
