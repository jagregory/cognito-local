import uuid from "uuid";
import { InvalidParameterError, UsernameExistsError } from "../errors";
import { Logger } from "../log";
import { Services } from "../services";
import { DeliveryDetails } from "../services/messageDelivery/messageDelivery";
import {
  attributesInclude,
  attributeValue,
  User,
} from "../services/userPoolClient";

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

export const SignUp = (
  { cognitoClient, messageDelivery, messages, otp }: Services,
  logger: Logger
): SignUpTarget => async (body) => {
  // TODO: This should behave differently depending on if PreventUserExistenceErrors
  // is enabled on the user pool. This will be the default after Feb 2020.
  // See: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-managing-errors.html
  const userPool = await cognitoClient.getUserPoolForClientId(body.ClientId);
  const existingUser = await userPool.getUserByUsername(body.Username);
  if (existingUser) {
    throw new UsernameExistsError();
  }

  const attributes = attributesInclude("sub", body.UserAttributes)
    ? body.UserAttributes
    : [{ Name: "sub", Value: uuid.v4() }, ...body.UserAttributes];

  const user: User = {
    Attributes: attributes,
    Enabled: true,
    Password: body.Password,
    UserCreateDate: new Date().getTime(),
    UserLastModifiedDate: new Date().getTime(),
    UserStatus: "UNCONFIRMED",
    Username: body.Username,
  };

  const email = attributeValue("email", user.Attributes);
  if (!email) {
    logger.error("Email required for code delivery");
    throw new InvalidParameterError();
  }

  const deliveryDetails: DeliveryDetails = {
    AttributeName: "email",
    DeliveryMedium: "EMAIL",
    Destination: email,
  };

  const code = otp();
  const message = await messages.signUp(code);
  await messageDelivery.deliver(user, deliveryDetails, message);

  await userPool.saveUser({
    ...user,
    ConfirmationCode: code,
  });

  return {
    CodeDeliveryDetails: deliveryDetails,
    UserConfirmed: user.UserStatus === "CONFIRMED",
    UserSub: attributeValue("sub", attributes) as string,
  };
};
