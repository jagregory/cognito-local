import type {
  ListDevicesRequest,
  ListDevicesResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import type { Services } from "../services";
import { paginate } from "../services/pagination";
import type { Token } from "../services/tokenGenerator";
import type { Target } from "./Target";

export type ListDevicesTarget = Target<ListDevicesRequest, ListDevicesResponse>;

type ListDevicesServices = Pick<Services, "cognito">;

export const ListDevices =
  ({ cognito }: ListDevicesServices): ListDevicesTarget =>
  async (ctx, req) => {
    const decodedToken = jwt.decode(req.AccessToken) as Token | null;
    if (!decodedToken) {
      throw new InvalidParameterError();
    }

    const userPool = await cognito.getUserPoolForClientId(
      ctx,
      decodedToken.client_id,
    );
    const user = await userPool.getUserByUsername(ctx, decodedToken.sub);
    if (!user) {
      throw new UserNotFoundError();
    }

    const devices = user.Devices ?? [];
    const { items, nextToken } = paginate(
      devices,
      req.Limit,
      req.PaginationToken,
    );

    return {
      Devices: items,
      PaginationToken: nextToken,
    };
  };
