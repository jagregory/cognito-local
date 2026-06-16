import type {
  SetRiskConfigurationRequest,
  SetRiskConfigurationResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import type { Target } from "./Target";

export type SetRiskConfigurationTarget = Target<
  SetRiskConfigurationRequest,
  SetRiskConfigurationResponse
>;

export const SetRiskConfiguration =
  ({ cognito }: Pick<Services, "cognito">): SetRiskConfigurationTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);

    const riskConfiguration = {
      UserPoolId: req.UserPoolId,
      ClientId: req.ClientId,
      CompromisedCredentialsRiskConfiguration:
        req.CompromisedCredentialsRiskConfiguration,
      AccountTakeoverRiskConfiguration: req.AccountTakeoverRiskConfiguration,
      RiskExceptionConfiguration: req.RiskExceptionConfiguration,
    };

    await userPool.updateOptions(ctx, {
      ...userPool.options,
      _riskConfiguration: riskConfiguration,
    } as any);

    return { RiskConfiguration: riskConfiguration };
  };
