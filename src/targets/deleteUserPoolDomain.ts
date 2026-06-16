import type {
  DeleteUserPoolDomainRequest,
  DeleteUserPoolDomainResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import type { Target } from "./Target";

export type DeleteUserPoolDomainTarget = Target<
  DeleteUserPoolDomainRequest,
  DeleteUserPoolDomainResponse
>;

type DeleteUserPoolDomainServices = Pick<Services, "cognito">;

export const DeleteUserPoolDomain =
  ({ cognito }: DeleteUserPoolDomainServices): DeleteUserPoolDomainTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);

    await userPool.updateOptions(ctx, {
      ...userPool.options,
      Domain: undefined,
      CustomDomain: undefined,
    });

    return {};
  };
