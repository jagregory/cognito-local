import type {
  DescribeRiskConfigurationRequest,
  DescribeRiskConfigurationResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import type { Target } from "./Target";

export type DescribeRiskConfigurationTarget = Target<
  DescribeRiskConfigurationRequest,
  DescribeRiskConfigurationResponse
>;

export const DescribeRiskConfiguration =
  ({ cognito }: Pick<Services, "cognito">): DescribeRiskConfigurationTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const riskConfiguration =
      (userPool.options as any)._riskConfiguration ?? {
        UserPoolId: req.UserPoolId,
        ClientId: req.ClientId,
      };

    return { RiskConfiguration: riskConfiguration };
  };
