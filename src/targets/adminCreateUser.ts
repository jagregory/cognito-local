import {
  AdminCreateUserRequest,
  AdminCreateUserResponse,
  DeliveryMediumListType,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import shortUUID from "short-uuid";
import uuid from "uuid";
import {
  InvalidParameterError,
  UnsupportedError,
  UsernameExistsError,
} from "../errors";
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

const generator = shortUUID(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!"
);

export type AdminCreateUserTarget = (
  req: AdminCreateUserRequest
) => Promise<AdminCreateUserResponse>;

type AdminCreateUserServices = Pick<
  Services,
  "clock" | "cognito" | "messageDelivery" | "messages"
>;

const selectAppropriateDeliveryMethod = (
  desiredDeliveryMediums: DeliveryMediumListType,
  user: User
): DeliveryDetails | null => {
  if (desiredDeliveryMediums.includes("SMS")) {
    const phoneNumber = attributeValue("phone_number", user.Attributes);
    if (phoneNumber) {
      return {
        AttributeName: "phone_number",
        DeliveryMedium: "SMS",
        Destination: phoneNumber,
      };
    }
  }

  if (desiredDeliveryMediums.includes("EMAIL")) {
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
  req: AdminCreateUserRequest,
  temporaryPassword: string,
  user: User,
  messages: Messages,
  userPool: UserPoolService,
  messageDelivery: MessageDelivery
) => {
  const deliveryDetails = selectAppropriateDeliveryMethod(
    req.DesiredDeliveryMediums ?? ["SMS"],
    user
  );
  if (!deliveryDetails) {
    // TODO: I don't know what the real error message should be for this
    throw new InvalidParameterError(
      "User has no attribute matching desired delivery mediums"
    );
  }

  const message = await messages.adminCreateUser(
    userPool.config.Id,
    user,
    temporaryPassword
  );
  await messageDelivery.deliver(user, deliveryDetails, message);
};

export const AdminCreateUser = ({
  clock,
  cognito,
  messageDelivery,
  messages,
}: AdminCreateUserServices): AdminCreateUserTarget => async (req) => {
  const userPool = await cognito.getUserPool(req.UserPoolId);
  const existingUser = await userPool.getUserByUsername(req.Username);
  if (existingUser && req.MessageAction === "RESEND") {
    throw new UnsupportedError("AdminCreateUser with MessageAction=RESEND");
  } else if (existingUser) {
    throw new UsernameExistsError();
  }

  const attributes = attributesInclude("sub", req.UserAttributes)
    ? req.UserAttributes ?? []
    : [{ Name: "sub", Value: uuid.v4() }, ...(req.UserAttributes ?? [])];

  const now = clock.get();

  const temporaryPassword =
    req.TemporaryPassword ?? generator.new().slice(0, 6);

  const user: User = {
    Username: req.Username,
    Password: temporaryPassword,
    Attributes: attributes,
    Enabled: true,
    UserStatus: "FORCE_CHANGE_PASSWORD",
    ConfirmationCode: undefined,
    UserCreateDate: now,
    UserLastModifiedDate: now,
  };
  await userPool.saveUser(user);

  // TODO: should throw InvalidParameterException when a non-email is supplied as the Username when the pool has email as a UsernameAttribute
  // TODO: should send a message unless MessageAction=="SUPPRESS"
  // TODO: support MessageAction=="RESEND"
  // TODO: should generate a TemporaryPassword if one isn't set
  // TODO: support ForceAliasCreation
  // TODO: support PreSignIn lambda and ValidationData

  await deliverWelcomeMessage(
    req,
    temporaryPassword,
    user,
    messages,
    userPool,
    messageDelivery
  );

  return {
    User: {
      Username: req.Username,
      Attributes: attributes,
      Enabled: true,
      UserStatus: "FORCE_CHANGE_PASSWORD",
      UserCreateDate: now,
      UserLastModifiedDate: now,
      MFAOptions: undefined,
    },
  };
};
