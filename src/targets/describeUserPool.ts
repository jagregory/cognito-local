import type {
  DescribeUserPoolRequest,
  DescribeUserPoolResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { ResourceNotFoundError } from "../errors";
import type { Services } from "../services";
import { userPoolToResponseObject } from "./responses";
import type { Target } from "./Target";

export type DescribeUserPoolTarget = Target<
  DescribeUserPoolRequest,
  DescribeUserPoolResponse
>;

export const DescribeUserPool =
  ({ cognito }: Pick<Services, "cognito">): DescribeUserPoolTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    if (!userPool) {
      throw new ResourceNotFoundError();
    }

    return {
      UserPool: userPoolToResponseObject(userPool.options),
    };
  };
