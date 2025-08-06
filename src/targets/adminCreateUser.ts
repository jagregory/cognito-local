import type {
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
import type { Messages, Services, UserPoolService } from "../services";
import type { Context } from "../services/context";
import type { DeliveryDetails } from "../services/messageDelivery/messageDelivery";
import {
  attributesInclude,
  attributeValue,
  type User,
} from "../services/userPoolService";
import { userToResponseObject } from "./responses";
import type { Target } from "./Target";

const generator = shortUUID(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!",
);

export type AdminCreateUserTarget = Target<
  AdminCreateUserRequest,
  AdminCreateUserResponse
>;

type AdminCreateUserServices = Pick<
  Services,
  "clock" | "cognito" | "messages" | "config"
>;

const selectAppropriateDeliveryMethod = (
  desiredDeliveryMediums: DeliveryMediumListType,
  user: User,
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
  userPool: UserPoolService,
) => {
  const deliveryDetails = selectAppropriateDeliveryMethod(
    req.DesiredDeliveryMediums ?? ["SMS"],
    user,
  );
  if (!deliveryDetails) {
    // TODO: I don't know what the real error message should be for this
    throw new InvalidParameterError(
      "User has no attribute matching desired delivery mediums",
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
    deliveryDetails,
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
    const supressWelcomeMessage = req.MessageAction === "SUPPRESS";

    if (existingUser && req.MessageAction === "RESEND") {
      throw new UnsupportedError("AdminCreateUser with MessageAction=RESEND");
    } else if (existingUser) {
      throw new UsernameExistsError();
    }

    const sub = uuid.v4();
    const attributes = attributesInclude("sub", req.UserAttributes)
      ? (req.UserAttributes ?? [])
      : [{ Name: "sub", Value: sub }, ...(req.UserAttributes ?? [])];

    const now = clock.get();

    const temporaryPassword =
      req.TemporaryPassword ?? process.env.CODE ?? generator.new().slice(0, 6);

    let username = req.Username;
    if (userPool.options.UsernameAttributes?.includes("email")) {
      // user pool is configured to use the email attribute as the user's username
      if (!req.Username.includes("@")) {
        // naive validation that the username is an email
        throw new InvalidParameterError("Username should be an email.");
      }

      if (!attributesInclude("email", attributes)) {
        attributes.push({ Name: "email", Value: req.Username });
      }

      // when the username is an email address, cognito uses the sub as the username in
      // requests/responses, triggers etc...
      username = sub;
    }

    const user: User = {
      Username: username,
      Password: temporaryPassword,
      Attributes: attributes.sort((a, b) => a.Name.localeCompare(b.Name)),
      Enabled: true,
      UserStatus: "FORCE_CHANGE_PASSWORD",
      ConfirmationCode: undefined,
      UserCreateDate: now,
      UserLastModifiedDate: now,
      RefreshTokens: [],
    };
    await userPool.saveUser(ctx, user);

    // TODO: should throw InvalidParameterException when a non-email is supplied as the Username when the pool has email as a UsernameAttribute
    // TODO: support MessageAction=="RESEND"
    // TODO: should generate a TemporaryPassword if one isn't set
    // TODO: support ForceAliasCreation
    // TODO: support PreSignIn lambda and ValidationData

    if (!supressWelcomeMessage) {
      await deliverWelcomeMessage(
        ctx,
        req,
        temporaryPassword,
        user,
        messages,
        userPool,
      );
    }

    return {
      User: userToResponseObject(user),
    };
  };
