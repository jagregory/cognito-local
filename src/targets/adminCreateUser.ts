import {
  AdminCreateUserRequest,
  AdminCreateUserResponse,
  DeliveryMediumListType,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import shortUUID from "short-uuid";
import * as uuid from "uuid";
import {
  InvalidParameterError,
  UnsupportedError,
  UsernameExistsError,
} from "../errors";
import { Messages, Services, UserPoolService } from "../services";
import { Context } from "../services/context";
import { DeliveryDetails } from "../services/messageDelivery/messageDelivery";
import {
  attributesInclude,
  attributeValue,
  User,
} from "../services/userPoolService";
import { userToResponseObject } from "./responses";
import { Target } from "./Target";

const generator = shortUUID(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!"
);

export type AdminCreateUserTarget = Target<
  AdminCreateUserRequest,
  AdminCreateUserResponse
>;

type AdminCreateUserServices = Pick<Services, "clock" | "cognito" | "messages">;

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
  ctx: Context,
  req: AdminCreateUserRequest,
  temporaryPassword: string,
  user: User,
  messages: Messages,
  userPool: UserPoolService
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

  await messages.deliver(
    ctx,
    "AdminCreateUser",
    null,
    userPool.options.Id,
    user,
    temporaryPassword,
    req.ClientMetadata,
    deliveryDetails
  );
};

export const AdminCreateUser =
  ({
    clock,
    cognito,
    messages,
  }: AdminCreateUserServices): AdminCreateUserTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const existingUser = await userPool.getUserByUsername(ctx, req.Username);
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
      RefreshTokens: [],
    };
    await userPool.saveUser(ctx, user);

    // TODO: should throw InvalidParameterException when a non-email is supplied as the Username when the pool has email as a UsernameAttribute
    // TODO: should send a message unless MessageAction=="SUPPRESS"
    // TODO: support MessageAction=="RESEND"
    // TODO: should generate a TemporaryPassword if one isn't set
    // TODO: support ForceAliasCreation
    // TODO: support PreSignIn lambda and ValidationData

    await deliverWelcomeMessage(
      ctx,
      req,
      temporaryPassword,
      user,
      messages,
      userPool
    );

    return {
      User: userToResponseObject(user),
    };
  };
