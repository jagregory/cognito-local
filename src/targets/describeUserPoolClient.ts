import {
  DescribeUserPoolClientRequest,
  DescribeUserPoolClientResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { ResourceNotFoundError } from "../errors";
import { Services } from "../services";

export type DescribeUserPoolClientTarget = (
  req: DescribeUserPoolClientRequest
) => Promise<DescribeUserPoolClientResponse>;

export const DescribeUserPoolClient = ({
  cognitoClient,
}: Pick<Services, "cognitoClient">): DescribeUserPoolClientTarget => async (
  req
) => {
  const client = await cognitoClient.getAppClient(req.ClientId);
  if (client?.UserPoolId !== req.UserPoolId) {
    throw new ResourceNotFoundError();
  }

  return {
    UserPoolClient: {
      ...client,
      CreationDate: new Date(client.CreationDate),
      LastModifiedDate: new Date(client.LastModifiedDate),
    },
  };
};
