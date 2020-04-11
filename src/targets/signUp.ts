import * as uuid from "uuid";
import { UsernameExistsError } from "../errors";
import { Services } from "../services";
import { DeliveryDetails } from "../services/codeDelivery/codeDelivery";
import { User } from "../services/userPool";

interface Input {
  ClientId: string;
  Username: string;
  Password: string;
  UserAttributes: readonly { Name: string; Value: string }[];
}

interface Output {
  UserConfirmed: boolean;
  UserSub: string;
  CodeDeliveryDetails: {
    AttributeName?: string;
    DeliveryMedium?: string;
    Destination?: string;
  };
}

export type SignUpTarget = (body: Input) => Promise<Output>;

export const SignUp = ({
  userPool,
  codeDelivery,
}: Services): SignUpTarget => async (body) => {
  // TODO: This should behave differently depending on if PreventUserExistenceErrors
  // is enabled on the user pool. This will be the default after Feb 2020.
  // See: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-managing-errors.html
  const existingUser = await userPool.getUserByUsername(body.Username);
  if (existingUser) {
    throw new UsernameExistsError();
  }

  const user: User = {
    Attributes: body.UserAttributes,
    Enabled: true,
    Password: body.Password,
    UserCreateDate: new Date().getTime(),
    UserLastModifiedDate: new Date().getTime(),
    UserStatus: "UNCONFIRMED",
    Username: uuid.v4(),
  };

  const deliveryDetails: DeliveryDetails = {
    AttributeName: "email",
    DeliveryMedium: "EMAIL",
    Destination: user.Attributes.filter((x) => x.Name === "email").map(
      (x) => x.Value
    )[0],
  };

  const code = await codeDelivery(user, deliveryDetails);

  await userPool.saveUser({
    ...user,
    ConfirmationCode: code,
  });

  return {
    UserConfirmed: user.UserStatus === "CONFIRMED",
    UserSub: user.Username,
    CodeDeliveryDetails: deliveryDetails,
  };
};
