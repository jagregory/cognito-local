import * as crypto from "node:crypto";
import type {
  AssociateSoftwareTokenRequest,
  AssociateSoftwareTokenResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Token } from "../services/tokenGenerator";
import type { Target } from "./Target";

export type AssociateSoftwareTokenTarget = Target<
  AssociateSoftwareTokenRequest,
  AssociateSoftwareTokenResponse
>;

type AssociateSoftwareTokenServices = Pick<Services, "cognito" | "clock">;

export const AssociateSoftwareToken =
  ({
    cognito,
    clock,
  }: AssociateSoftwareTokenServices): AssociateSoftwareTokenTarget =>
  async (ctx, req) => {
    if (!req.AccessToken && !req.Session) {
      throw new InvalidParameterError("AccessToken or Session is required");
    }

    // Generate a TOTP secret (20 bytes = 160 bits, standard for TOTP)
    const secretBytes = crypto.randomBytes(20);
    const secretCode = base32Encode(secretBytes);

    if (req.AccessToken) {
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

      await userPool.saveUser(ctx, {
        ...user,
        TOTPSecret: secretCode,
        UserLastModifiedDate: clock.get(),
      });
    }

    return {
      SecretCode: secretCode,
      Session: uuid.v4(),
    };
  };

// RFC 4648 base32 encoding
function base32Encode(buffer: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}
