import type {
  GetDeviceRequest,
  GetDeviceResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { InvalidParameterError, ResourceNotFoundError, UserNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Token } from "../services/tokenGenerator";
import type { Target } from "./Target";

export type GetDeviceTarget = Target<GetDeviceRequest, GetDeviceResponse>;

type GetDeviceServices = Pick<Services, "cognito">;

export const GetDevice =
  ({ cognito }: GetDeviceServices): GetDeviceTarget =>
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
    const device = devices.find((d) => d.DeviceKey === req.DeviceKey);
    if (!device) {
      throw new ResourceNotFoundError("Device not found.");
    }

    return {
      Device: device,
    };
  };
