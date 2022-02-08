import {
  DescribeUserPoolClientRequest,
  DescribeUserPoolClientResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { ResourceNotFoundError } from "../errors";
import { Services } from "../services";
import { Target } from "./Target";

export type DescribeUserPoolClientTarget = Target<
  DescribeUserPoolClientRequest,
  DescribeUserPoolClientResponse
>;

export const DescribeUserPoolClient =
  ({ cognito }: Pick<Services, "cognito">): DescribeUserPoolClientTarget =>
  async (ctx, req) => {
    const client = await cognito.getAppClient(ctx, req.ClientId);
    if (client?.UserPoolId !== req.UserPoolId) {
      throw new ResourceNotFoundError();
    }

    return {
      UserPoolClient: {
        ...client,
        CreationDate: client.CreationDate,
        LastModifiedDate: client.LastModifiedDate,
      },
    };
  };
