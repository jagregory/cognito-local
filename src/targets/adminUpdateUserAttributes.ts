import {
  AdminUpdateUserAttributesRequest,
  AdminUpdateUserAttributesResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";
import { NotAuthorizedError } from "../errors";
import { Target } from "./router";

export type AdminUpdateUserAttributesTarget = Target<
  AdminUpdateUserAttributesRequest,
  AdminUpdateUserAttributesResponse
>;

export const AdminUpdateUserAttributes =
  ({ cognito }: Services): AdminUpdateUserAttributesTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const user = await userPool.getUserByUsername(ctx, req.Username);
    if (!user) {
      throw new NotAuthorizedError();
    }

    // TODO: Should save the attributes.
    return {
      UserAttributes: user.Attributes,
    };
  };
