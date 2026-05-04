import jwt from "jsonwebtoken";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import type { Services } from "../services";
import { paginate } from "../services/pagination";
import type { Token } from "../services/tokenGenerator";
import type { Target } from "./Target";

interface ListWebAuthnCredentialsRequest {
  AccessToken: string;
  NextToken?: string;
  MaxResults?: number;
}
interface ListWebAuthnCredentialsResponse {
  Credentials?: any[];
  NextToken?: string;
}

export type ListWebAuthnCredentialsTarget = Target<
  ListWebAuthnCredentialsRequest,
  ListWebAuthnCredentialsResponse
>;

export const ListWebAuthnCredentials =
  ({ cognito }: Pick<Services, "cognito">): ListWebAuthnCredentialsTarget =>
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

    const { items, nextToken } = paginate(
      credentials,
      req.MaxResults,
      req.NextToken,
    );

    return {
      Credentials: items,
      NextToken: nextToken,
    };
  };
