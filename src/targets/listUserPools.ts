import {
  ListUserPoolsRequest,
  ListUserPoolsResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";
import { UserPool } from "../services/userPoolService";
import { Target } from "./Target";

export type ListUserPoolsTarget = Target<
  ListUserPoolsRequest,
  ListUserPoolsResponse
>;

type ListGroupServices = Pick<Services, "cognito">;

export const ListUserPools =
  ({ cognito }: ListGroupServices): ListUserPoolsTarget =>
  async (ctx) => {
    // TODO: NextToken support
    // TODO: MaxResults support

    const userPools = (await cognito.listUserPools(ctx)) as UserPool[];

    return {
      UserPools: userPools,
    };
  };
