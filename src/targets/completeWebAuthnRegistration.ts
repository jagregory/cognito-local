import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import type { Services } from "../services";
import type { Token } from "../services/tokenGenerator";
import type { Target } from "./Target";

interface CompleteWebAuthnRegistrationRequest {
  AccessToken: string;
  Credential?: any;
}
interface CompleteWebAuthnRegistrationResponse {}

export type CompleteWebAuthnRegistrationTarget = Target<
  CompleteWebAuthnRegistrationRequest,
  CompleteWebAuthnRegistrationResponse
>;

export const CompleteWebAuthnRegistration =
  ({
    cognito,
    clock,
  }: Pick<Services, "cognito" | "clock">): CompleteWebAuthnRegistrationTarget =>
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

    const credentials =
      ((user as any)._webauthnCredentials as any[]) ?? [];
    credentials.push({
      CredentialId: uuid.v4(),
      FriendlyCredentialName: req.Credential?.friendlyName,
      RelyingPartyId: "localhost",
      AuthenticatorAttachment: "platform",
      AuthenticatorTransports: ["internal"],
      CreatedAt: clock.get(),
    });

    await userPool.saveUser(ctx, {
      ...user,
      _webauthnCredentials: credentials,
      UserLastModifiedDate: clock.get(),
    } as any);

    return {};
  };
