import type { Services } from "../services";
import type { Target } from "./Target";

interface SetLogDeliveryConfigurationRequest {
  UserPoolId: string;
  LogConfigurations?: any[];
}
interface SetLogDeliveryConfigurationResponse {
  LogDeliveryConfiguration?: any;
}

export type SetLogDeliveryConfigurationTarget = Target<
  SetLogDeliveryConfigurationRequest,
  SetLogDeliveryConfigurationResponse
>;

export const SetLogDeliveryConfiguration =
  ({
    cognito,
  }: Pick<Services, "cognito">): SetLogDeliveryConfigurationTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);

    const config = {
      UserPoolId: req.UserPoolId,
      LogConfigurations: req.LogConfigurations ?? [],
    };

    await userPool.updateOptions(ctx, {
      ...userPool.options,
      _logDeliveryConfiguration: config,
    } as any);

    return { LogDeliveryConfiguration: config };
  };
