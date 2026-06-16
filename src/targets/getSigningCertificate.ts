import type {
  GetSigningCertificateRequest,
  GetSigningCertificateResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import type { Target } from "./Target";

export type GetSigningCertificateTarget = Target<
  GetSigningCertificateRequest,
  GetSigningCertificateResponse
>;

const PLACEHOLDER_CERTIFICATE =
  "MIICnTCCAYUCBgF7FBz9OjANBgkqhkiG9w0BAQsFADASMRAwDgYDVQQDDAdleGFtcGxl";

export const GetSigningCertificate =
  ({ cognito }: Pick<Services, "cognito">): GetSigningCertificateTarget =>
  async (ctx, req) => {
    // Ensure pool exists
    await cognito.getUserPool(ctx, req.UserPoolId);

    return {
      Certificate: PLACEHOLDER_CERTIFICATE,
    };
  };
