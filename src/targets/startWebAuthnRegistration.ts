import * as crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Token } from "../services/tokenGenerator";
import type { Target } from "./Target";

interface StartWebAuthnRegistrationRequest {
  AccessToken: string;
}
interface StartWebAuthnRegistrationResponse {
  CredentialCreationOptions?: any;
}

export type StartWebAuthnRegistrationTarget = Target<
  StartWebAuthnRegistrationRequest,
  StartWebAuthnRegistrationResponse
>;

export const StartWebAuthnRegistration =
  ({
    cognito,
  }: Pick<Services, "cognito">): StartWebAuthnRegistrationTarget =>
  async (ctx, req) => {
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

    return {
      CredentialCreationOptions: {
        publicKey: {
          rp: { id: "localhost", name: "cognito-local" },
          user: {
            id: user.Username,
            name: user.Username,
            displayName: user.Username,
          },
          challenge: crypto.randomBytes(32).toString("base64url"),
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        },
      },
    };
  };
