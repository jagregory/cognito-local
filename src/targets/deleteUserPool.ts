import { DeleteUserPoolRequest } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { ResourceNotFoundError } from "../errors";
import { Services } from "../services";
import { Target } from "./Target";

export type DeleteUserPoolTarget = Target<DeleteUserPoolRequest, {}>;

type DeleteUserPoolServices = Pick<Services, "cognito">;

export const DeleteUserPool =
  ({ cognito }: DeleteUserPoolServices): DeleteUserPoolTarget =>
  async (ctx, req) => {
    // TODO: from the docs "Calling this action requires developer credentials.", can we enforce this?
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    if (!userPool) {
      throw new ResourceNotFoundError();
    }

    await cognito.deleteUserPool(ctx, userPool.options);

    return {};
  };
