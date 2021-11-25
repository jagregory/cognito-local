import {
  SignUpRequest,
  SignUpResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import uuid from "uuid";
import { InvalidParameterError, UsernameExistsError } from "../errors";
import { Logger } from "../log";
import { Services } from "../services";
import { DeliveryDetails } from "../services/messageDelivery/messageDelivery";
import {
  attributesInclude,
  attributeValue,
  User,
} from "../services/userPoolService";

export type SignUpTarget = (req: SignUpRequest) => Promise<SignUpResponse>;

type SignUpServices = Pick<
  Services,
  "cognito" | "clock" | "messages" | "messageDelivery" | "otp"
>;

export const SignUp = (
  { cognito, clock, messageDelivery, messages, otp }: SignUpServices,
  logger: Logger
): SignUpTarget => async (req) => {
  // TODO: This should behave differently depending on if PreventUserExistenceErrors
  // is enabled on the user pool. This will be the default after Feb 2020.
  // See: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-managing-errors.html
  const userPool = await cognito.getUserPoolForClientId(req.ClientId);
  const existingUser = await userPool.getUserByUsername(req.Username);
  if (existingUser) {
    throw new UsernameExistsError();
  }

  const attributes = attributesInclude("sub", req.UserAttributes)
    ? req.UserAttributes ?? []
    : [{ Name: "sub", Value: uuid.v4() }, ...(req.UserAttributes ?? [])];

  const now = clock.get().getTime();
  const user: User = {
    Attributes: attributes,
    Enabled: true,
    Password: req.Password,
    UserCreateDate: now,
    UserLastModifiedDate: now,
    UserStatus: "UNCONFIRMED",
    Username: req.Username,
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
  const message = await messages.signUp(
    req.ClientId,
    userPool.config.Id,
    user,
    code
  );
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
