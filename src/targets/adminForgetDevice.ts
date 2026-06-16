import type { AdminForgetDeviceRequest } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { ResourceNotFoundError, UserNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type AdminForgetDeviceTarget = Target<AdminForgetDeviceRequest, {}>;

type AdminForgetDeviceServices = Pick<Services, "cognito" | "clock">;

export const AdminForgetDevice =
  ({ cognito, clock }: AdminForgetDeviceServices): AdminForgetDeviceTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const user = await userPool.getUserByUsername(ctx, req.Username);
    if (!user) {
      throw new UserNotFoundError();
    }

    const devices = user.Devices ?? [];
    const index = devices.findIndex((d) => d.DeviceKey === req.DeviceKey);
    if (index === -1) {
      throw new ResourceNotFoundError("Device not found.");
    }

    devices.splice(index, 1);

    await userPool.saveUser(ctx, {
      ...user,
      Devices: devices,
      UserLastModifiedDate: clock.get(),
    });

    return {};
  };
