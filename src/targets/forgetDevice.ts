import type { ForgetDeviceRequest } from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { InvalidParameterError, ResourceNotFoundError, UserNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Token } from "../services/tokenGenerator";
import type { Target } from "./Target";

export type ForgetDeviceTarget = Target<ForgetDeviceRequest, {}>;

type ForgetDeviceServices = Pick<Services, "cognito" | "clock">;

export const ForgetDevice =
  ({ cognito, clock }: ForgetDeviceServices): ForgetDeviceTarget =>
  async (ctx, req) => {
    const decodedToken = req.AccessToken
      ? (jwt.decode(req.AccessToken) as Token | null)
      : null;
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
