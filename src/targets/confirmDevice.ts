import type {
  ConfirmDeviceRequest,
  ConfirmDeviceResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Token } from "../services/tokenGenerator";
import type { Target } from "./Target";

export type ConfirmDeviceTarget = Target<
  ConfirmDeviceRequest,
  ConfirmDeviceResponse
>;

type ConfirmDeviceServices = Pick<Services, "cognito" | "clock">;

export const ConfirmDevice =
  ({ cognito, clock }: ConfirmDeviceServices): ConfirmDeviceTarget =>
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

    const now = clock.get();
    const device = {
      DeviceKey: req.DeviceKey,
      DeviceAttributes: [{ Name: "device_name", Value: req.DeviceName }],
      DeviceCreateDate: now,
      DeviceLastModifiedDate: now,
      DeviceLastAuthenticatedDate: now,
    };

    const devices = user.Devices ?? [];
    devices.push(device);

    await userPool.saveUser(ctx, {
      ...user,
      Devices: devices,
      UserLastModifiedDate: now,
    });

    return {
      UserConfirmationNecessary: false,
    };
  };
