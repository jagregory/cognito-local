import type {
  ListUserPoolClientsRequest,
  ListUserPoolClientsResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
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
    // TODO: NextToken support
    // TODO: MaxResults support

    const clients = await cognito.listAppClients(ctx, req.UserPoolId);

    return {
      UserPoolClients: clients.map(appClientToResponseObject),
    };
  };
