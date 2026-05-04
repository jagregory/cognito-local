import type {
  AdminResetUserPasswordRequest,
  AdminResetUserPasswordResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import type { Services } from "../services";
import { attributeValue } from "../services/userPoolService";
import type { Target } from "./Target";

export type AdminResetUserPasswordTarget = Target<
  AdminResetUserPasswordRequest,
  AdminResetUserPasswordResponse
>;

type AdminResetUserPasswordServices = Pick<
  Services,
  "cognito" | "clock" | "messages" | "otp"
>;

export const AdminResetUserPassword =
  ({
    cognito,
    clock,
    messages,
    otp,
  }: AdminResetUserPasswordServices): AdminResetUserPasswordTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const user = await userPool.getUserByUsername(ctx, req.Username);
    if (!user) {
      throw new UserNotFoundError();
    }

    const code = otp();

    const email = attributeValue("email", user.Attributes);
    if (email) {
      await messages.deliver(
        ctx,
        "ForgotPassword",
        null,
        req.UserPoolId,
        user,
        code,
        req.ClientMetadata,
        {
          AttributeName: "email",
          DeliveryMedium: "EMAIL",
          Destination: email,
        },
      );
    }

    await userPool.saveUser(ctx, {
      ...user,
      UserStatus: "RESET_REQUIRED",
      ConfirmationCode: code,
      UserLastModifiedDate: clock.get(),
    });

    return {};
  };
