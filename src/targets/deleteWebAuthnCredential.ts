import jwt from "jsonwebtoken";
import {
  InvalidParameterError,
  ResourceNotFoundError,
  UserNotFoundError,
} from "../errors";
import type { Services } from "../services";
import type { Token } from "../services/tokenGenerator";
import type { Target } from "./Target";

interface DeleteWebAuthnCredentialRequest {
  AccessToken: string;
  CredentialId: string;
}
interface DeleteWebAuthnCredentialResponse {}

export type DeleteWebAuthnCredentialTarget = Target<
  DeleteWebAuthnCredentialRequest,
  DeleteWebAuthnCredentialResponse
>;

export const DeleteWebAuthnCredential =
  ({
    cognito,
    clock,
  }: Pick<Services, "cognito" | "clock">): DeleteWebAuthnCredentialTarget =>
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
    const idx = credentials.findIndex(
      (c: any) => c.CredentialId === req.CredentialId,
    );
    if (idx < 0) {
      throw new ResourceNotFoundError("Credential not found");
    }

    credentials.splice(idx, 1);

    await userPool.saveUser(ctx, {
      ...user,
      _webauthnCredentials: credentials,
      UserLastModifiedDate: clock.get(),
    } as any);

    return {};
  };
