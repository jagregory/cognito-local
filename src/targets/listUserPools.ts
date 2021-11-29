import {
  ListUserPoolsRequest,
  ListUserPoolsResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";
import { UserPool } from "../services/userPoolService";

export type ListUserPoolsTarget = (
  req: ListUserPoolsRequest
) => Promise<ListUserPoolsResponse>;

type ListGroupServices = Pick<Services, "cognito">;

export const ListUserPools =
  ({ cognito }: ListGroupServices): ListUserPoolsTarget =>
  async () => {
    // TODO: NextToken support
    // TODO: MaxResults support

    const userPools = (await cognito.listUserPools()) as UserPool[];

    return {
      UserPools: userPools,
    };
  };
