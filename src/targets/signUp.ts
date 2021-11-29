import {
  SignUpRequest,
  SignUpResponse,
  VerifiedAttributesListType,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import uuid from "uuid";
import { InvalidParameterError, UsernameExistsError } from "../errors";
import {
  MessageDelivery,
  Messages,
  Services,
  UserPoolService,
} from "../services";
import { DeliveryDetails } from "../services/messageDelivery/messageDelivery";
import {
  attributesInclude,
  attributeValue,
  User,
} from "../services/userPoolService";

export type SignUpTarget = (req: SignUpRequest) => Promise<SignUpResponse>;

type SignUpServices = Pick<
  Services,
  "clock" | "cognito" | "messages" | "messageDelivery" | "otp"
>;

const selectAppropriateDeliveryMethod = (
  desiredDeliveryMediums: VerifiedAttributesListType,
  user: User
): DeliveryDetails | null => {
  if (desiredDeliveryMediums.includes("phone_number")) {
    const phoneNumber = attributeValue("phone_number", user.Attributes);
    if (phoneNumber) {
      return {
        AttributeName: "phone_number",
        DeliveryMedium: "SMS",
        Destination: phoneNumber,
      };
    }
  }

  if (desiredDeliveryMediums.includes("email")) {
    const email = attributeValue("email", user.Attributes);
    if (email) {
      return {
        AttributeName: "email",
        DeliveryMedium: "EMAIL",
        Destination: email,
      };
    }
  }

  return null;
};

const deliverWelcomeMessage = async (
  code: string,
  clientId: string,
  user: User,
  userPool: UserPoolService,
  messages: Messages,
  messageDelivery: MessageDelivery,
  clientMetadata: Record<string, string> | undefined
): Promise<DeliveryDetails | null> => {
  const deliveryDetails = selectAppropriateDeliveryMethod(
    userPool.config.AutoVerifiedAttributes ?? [],
    user
  );
  if (!deliveryDetails && !userPool.config.AutoVerifiedAttributes) {
    // From the console: When Cognito's default verification method is not enabled, you must use APIs or Lambda triggers
    // to verify phone numbers and email addresses as well as to confirm user accounts.
    return null;
  } else if (!deliveryDetails) {
    // TODO: I don't know what the real error message should be for this
    throw new InvalidParameterError(
      "User has no attribute matching desired auto verified attributes"
    );
  }

  const message = await messages.signUp(
    clientId,
    userPool.config.Id,
    user,
    code,
    clientMetadata
  );
  await messageDelivery.deliver(user, deliveryDetails, message);

  return deliveryDetails;
};

export const SignUp = ({
  clock,
  cognito,
  messageDelivery,
  messages,
  otp,
}: SignUpServices): SignUpTarget => async (req) => {
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

  const now = clock.get();
  const user: User = {
    Attributes: attributes,
    Enabled: true,
    Password: req.Password,
    UserCreateDate: now,
    UserLastModifiedDate: now,
    UserStatus: "UNCONFIRMED",
    Username: req.Username,
  };

  // TODO: call PreSignUp trigger
  // TODO: do we also need a UserMigration call in here?
  // TODO: call PostConfirmation if PreSignUp confirms auto confirms the user

  const code = otp();

  const deliveryDetails = await deliverWelcomeMessage(
    code,
    req.ClientId,
    user,
    userPool,
    messages,
    messageDelivery,
    req.ClientMetadata
  );

  await userPool.saveUser({
    ...user,
    ConfirmationCode: code,
  });

  return {
    CodeDeliveryDetails: deliveryDetails ?? undefined,
    UserConfirmed: user.UserStatus === "CONFIRMED",
    UserSub: attributeValue("sub", attributes) as string,
  };
};
