import type {
  AdminListDevicesRequest,
  AdminListDevicesResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { UserNotFoundError } from "../errors";
import type { Services } from "../services";
import { paginate } from "../services/pagination";
import type { Target } from "./Target";

export type AdminListDevicesTarget = Target<
  AdminListDevicesRequest,
  AdminListDevicesResponse
>;

type AdminListDevicesServices = Pick<Services, "cognito">;

export const AdminListDevices =
  ({ cognito }: AdminListDevicesServices): AdminListDevicesTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const user = await userPool.getUserByUsername(ctx, req.Username);
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
