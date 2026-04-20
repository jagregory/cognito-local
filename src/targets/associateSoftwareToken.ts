import type {
  AssociateSoftwareTokenRequest,
  AssociateSoftwareTokenResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { InvalidParameterError, NotAuthorizedError } from "../errors";
import type { Services } from "../services";
import type { Token } from "../services/tokenGenerator";
import { generateSecret } from "../services/totp";
import type { Target } from "./Target";

export type AssociateSoftwareTokenTarget = Target<
  AssociateSoftwareTokenRequest,
  AssociateSoftwareTokenResponse
>;

type AssociateSoftwareTokenServices = Pick<Services, "cognito">;

export const AssociateSoftwareToken =
  ({ cognito }: AssociateSoftwareTokenServices): AssociateSoftwareTokenTarget =>
  async (ctx, req) => {
    if (!req.AccessToken && !req.Session) {
      throw new InvalidParameterError(
        "Either AccessToken or Session is required",
      );
    }

    if (!req.AccessToken) {
      throw new InvalidParameterError(
        "AssociateSoftwareToken via Session (MFA_SETUP flow) is not supported; call with AccessToken",
      );
    }

    const decoded = jwt.decode(req.AccessToken) as Token | null;
    if (!decoded) {
      throw new InvalidParameterError();
    }

    const userPool = await cognito.getUserPoolForClientId(
      ctx,
      decoded.client_id,
    );
    const user = await userPool.getUserByUsername(ctx, decoded.sub);
    if (!user) {
      throw new NotAuthorizedError();
    }

    const secret = generateSecret();
    await userPool.saveUser(ctx, {
      ...user,
      SoftwareTokenMfaConfiguration: {
        Secret: secret,
        Verified: false,
      },
    });

    return {
      SecretCode: secret,
    };
  };
