import type {
  AdminUpdateAuthEventFeedbackRequest,
  AdminUpdateAuthEventFeedbackResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import type { Target } from "./Target";

export type AdminUpdateAuthEventFeedbackTarget = Target<
  AdminUpdateAuthEventFeedbackRequest,
  AdminUpdateAuthEventFeedbackResponse
>;

export const AdminUpdateAuthEventFeedback =
  ({
    cognito,
  }: Pick<Services, "cognito">): AdminUpdateAuthEventFeedbackTarget =>
  async (ctx, req) => {
    // Ensure pool exists
    await cognito.getUserPool(ctx, req.UserPoolId);
    // No-op in emulator
    return {};
  };
