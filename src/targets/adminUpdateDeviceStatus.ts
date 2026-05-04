import type {
  AdminUpdateDeviceStatusRequest,
  AdminUpdateDeviceStatusResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { ResourceNotFoundError, UserNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type AdminUpdateDeviceStatusTarget = Target<
  AdminUpdateDeviceStatusRequest,
  AdminUpdateDeviceStatusResponse
>;

type AdminUpdateDeviceStatusServices = Pick<Services, "cognito" | "clock">;

export const AdminUpdateDeviceStatus =
  ({
    cognito,
    clock,
  }: AdminUpdateDeviceStatusServices): AdminUpdateDeviceStatusTarget =>
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

    device.DeviceLastModifiedDate = clock.get();
    if (req.DeviceRememberedStatus) {
      device.DeviceAttributes = device.DeviceAttributes ?? [];
      const existing = device.DeviceAttributes.find(
        (a: any) => a.Name === "device_status",
      );
      if (existing) {
        existing.Value = req.DeviceRememberedStatus;
      } else {
        device.DeviceAttributes.push({
          Name: "device_status",
          Value: req.DeviceRememberedStatus,
        });
      }
    }

    await userPool.saveUser(ctx, {
      ...user,
      Devices: devices,
      UserLastModifiedDate: clock.get(),
    });

    return {};
  };
