import { Services } from "../services";

interface Input {
  UserPoolId: string;
  Username: string;
  TemporaryPassword: string;
  MessageAction?: string;
  UserAttributes?: any;
  DesiredDeliveryMediums?: any;
}

export type AdminCreateUserTarget = (body: Input) => Promise<null>;

export const AdminCreateUser = ({
  cognitoClient,
}: Services): AdminCreateUserTarget => async (body) => {
  const { UserPoolId, Username, TemporaryPassword, UserAttributes } =
    body || {};
  const userPool = await cognitoClient.getUserPool(UserPoolId);
  await userPool.saveUser({
    Username,
    Password: TemporaryPassword,
    Attributes: UserAttributes,
    Enabled: true,
    UserStatus: "CONFIRMED",
    ConfirmationCode: undefined,
    UserCreateDate: new Date().getTime(),
    UserLastModifiedDate: new Date().getTime(),
  });
  // TODO: Anything to return?
  return null;
};
