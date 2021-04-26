import { Services } from "../services";
import { User } from "../services/userPoolClient";

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
  const user: User = {
    Username,
    Password: TemporaryPassword,
    Attributes: UserAttributes,
    Enabled: true,
    UserStatus: "CONFIRMED",
    ConfirmationCode: undefined,
    UserCreateDate: new Date().getTime(),
    UserLastModifiedDate: new Date().getTime(),
  };
  await userPool.saveUser(user);
  // TODO: Shuldn't return password.
  return user;
};
