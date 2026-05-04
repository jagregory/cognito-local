import type {
  ListUserPoolClientsRequest,
  ListUserPoolClientsResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import { paginate } from "../services/pagination";
import { appClientToResponseObject } from "./responses";
import type { Target } from "./Target";

export type ListUserPoolClientsTarget = Target<
  ListUserPoolClientsRequest,
  ListUserPoolClientsResponse
>;

type ListGroupServices = Pick<Services, "cognito">;

export const ListUserPoolClients =
  ({ cognito }: ListGroupServices): ListUserPoolClientsTarget =>
  async (ctx, req) => {
    const clients = await cognito.listAppClients(ctx, req.UserPoolId);

    const { items, nextToken } = paginate(
      clients,
      req.MaxResults,
      req.NextToken,
    );

    return {
      UserPoolClients: items.map(appClientToResponseObject),
      NextToken: nextToken,
    };
  };
