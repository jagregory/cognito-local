import type {
  AdminGetDeviceRequest,
  AdminGetDeviceResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { ResourceNotFoundError, UserNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type AdminGetDeviceTarget = Target<
  AdminGetDeviceRequest,
  AdminGetDeviceResponse
>;

type AdminGetDeviceServices = Pick<Services, "cognito">;

export const AdminGetDevice =
  ({ cognito }: AdminGetDeviceServices): AdminGetDeviceTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const user = await userPool.getUserByUsername(ctx, req.Username);
    if (!user) {
      throw new UserNotFoundError();
    }

    const devices = user.Devices ?? [];
    const device = devices.find((d) => d.DeviceKey === req.DeviceKey);
    if (!device) {
      throw new ResourceNotFoundError("Device not found.");
    }

    return {
      Device: device,
    };
  };
