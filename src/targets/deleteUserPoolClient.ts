import type { DeleteUserPoolClientRequest } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { ResourceNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type DeleteUserPoolClientTarget = Target<
  DeleteUserPoolClientRequest,
  object
>;

type DeleteUserPoolClientServices = Pick<Services, "cognito">;

export const DeleteUserPoolClient =
  ({ cognito }: DeleteUserPoolClientServices): DeleteUserPoolClientTarget =>
  async (ctx, req) => {
    // TODO: from the docs "Calling this action requires developer credentials.", can we enforce this?

    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const appClient = await cognito.getAppClient(ctx, req.ClientId);
    if (!appClient || appClient.UserPoolId !== req.UserPoolId) {
      throw new ResourceNotFoundError();
    }

    await userPool.deleteAppClient(ctx, appClient);

    return {};
  };
