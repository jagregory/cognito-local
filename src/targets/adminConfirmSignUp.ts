import {
  AdminConfirmSignUpRequest,
  AdminConfirmSignUpResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";
import { NotAuthorizedError } from "../errors";
import { Target } from "./router";

export type AdminConfirmSignUpTarget = Target<
  AdminConfirmSignUpRequest,
  AdminConfirmSignUpResponse
>;

export const AdminConfirmSignUp =
  ({ cognito }: Services): AdminConfirmSignUpTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const user = await userPool.getUserByUsername(ctx, req.Username);
    if (!user) {
      throw new NotAuthorizedError();
    }

    // TODO: call PostConfirmation lambda

    await userPool.saveUser(ctx, {
      ...user,
      UserStatus: "CONFIRMED",
      // TODO: Remove existing email_verified attribute?
      Attributes: [
        ...(user.Attributes || []),
        {
          Name: "email_verified",
          Value: "true",
        },
      ],
    });

    return {};
  };
