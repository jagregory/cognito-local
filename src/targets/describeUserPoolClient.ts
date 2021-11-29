import {
  DescribeUserPoolClientRequest,
  DescribeUserPoolClientResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { ResourceNotFoundError } from "../errors";
import { Services } from "../services";

export type DescribeUserPoolClientTarget = (
  req: DescribeUserPoolClientRequest
) => Promise<DescribeUserPoolClientResponse>;

export const DescribeUserPoolClient =
  ({ cognito }: Pick<Services, "cognito">): DescribeUserPoolClientTarget =>
  async (req) => {
    const client = await cognito.getAppClient(req.ClientId);
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
