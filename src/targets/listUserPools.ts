import type {
  ListUserPoolsRequest,
  ListUserPoolsResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import { paginate } from "../services/pagination";
import { userPoolToResponseObject } from "./responses";
import type { Target } from "./Target";

export type ListUserPoolsTarget = Target<
  ListUserPoolsRequest,
  ListUserPoolsResponse
>;

type ListGroupServices = Pick<Services, "cognito">;

export const ListUserPools =
  ({ cognito }: ListGroupServices): ListUserPoolsTarget =>
  async (ctx, req) => {
    const userPools = await cognito.listUserPools(ctx);

    const { items, nextToken } = paginate(
      userPools,
      req.MaxResults,
      req.NextToken,
    );

    return {
      UserPools: items.map(userPoolToResponseObject),
      NextToken: nextToken,
    };
  };
