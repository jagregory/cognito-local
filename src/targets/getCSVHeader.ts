import type {
  GetCSVHeaderRequest,
  GetCSVHeaderResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import type { Services } from "../services";
import type { Target } from "./Target";

export type GetCSVHeaderTarget = Target<
  GetCSVHeaderRequest,
  GetCSVHeaderResponse
>;

const CSV_HEADER_FIELDS = [
  "name",
  "given_name",
  "family_name",
  "middle_name",
  "nickname",
  "preferred_username",
  "profile",
  "picture",
  "website",
  "email",
  "email_verified",
  "gender",
  "birthdate",
  "zoneinfo",
  "locale",
  "phone_number",
  "phone_number_verified",
  "address",
  "updated_at",
  "cognito:mfa_enabled",
  "cognito:username",
];

export const GetCSVHeader =
  ({ cognito }: Pick<Services, "cognito">): GetCSVHeaderTarget =>
  async (ctx, req) => {
    // Ensure pool exists
    await cognito.getUserPool(ctx, req.UserPoolId);

    return {
      UserPoolId: req.UserPoolId,
      CSVHeader: CSV_HEADER_FIELDS,
    };
  };
