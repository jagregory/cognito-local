import type {
  UpdateAuthEventFeedbackRequest,
  UpdateAuthEventFeedbackResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import type { Target } from "./Target";

export type UpdateAuthEventFeedbackTarget = Target<
  UpdateAuthEventFeedbackRequest,
  UpdateAuthEventFeedbackResponse
>;

export const UpdateAuthEventFeedback =
  ({ cognito }: Pick<Services, "cognito">): UpdateAuthEventFeedbackTarget =>
  async (ctx, req) => {
    // Ensure pool exists
    await cognito.getUserPool(ctx, req.UserPoolId);
    // No-op in emulator
    return {};
  };
