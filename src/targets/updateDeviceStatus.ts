import type {
  UpdateDeviceStatusRequest,
  UpdateDeviceStatusResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { InvalidParameterError, ResourceNotFoundError, UserNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Token } from "../services/tokenGenerator";
import type { Target } from "./Target";

export type UpdateDeviceStatusTarget = Target<
  UpdateDeviceStatusRequest,
  UpdateDeviceStatusResponse
>;

type UpdateDeviceStatusServices = Pick<Services, "cognito" | "clock">;

export const UpdateDeviceStatus =
  ({ cognito, clock }: UpdateDeviceStatusServices): UpdateDeviceStatusTarget =>
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
