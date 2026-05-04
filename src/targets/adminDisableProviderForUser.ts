import type {
  AdminDisableProviderForUserRequest,
  AdminDisableProviderForUserResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { UserNotFoundError } from "../errors";
import type { Services } from "../services";
import { attributesAppend, attribute, attributeValue } from "../services/userPoolService";
import type { Target } from "./Target";

export type AdminDisableProviderForUserTarget = Target<
  AdminDisableProviderForUserRequest,
  AdminDisableProviderForUserResponse
>;

type AdminDisableProviderForUserServices = Pick<Services, "cognito" | "clock">;

export const AdminDisableProviderForUser =
  ({
    cognito,
    clock,
  }: AdminDisableProviderForUserServices): AdminDisableProviderForUserTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);

    const providerName = req.User?.ProviderName ?? "";
    const providerValue = req.User?.ProviderAttributeValue ?? "";

    // Find the user that has this provider linked
    const users = await userPool.listUsers(ctx);
    const user = users.find((u) => {
      const identitiesStr = attributeValue("identities", u.Attributes);
      if (!identitiesStr) return false;
      try {
        const identities = JSON.parse(identitiesStr);
        return identities.some(
          (id: any) =>
            id.providerName === providerName &&
            id.userId === providerValue,
        );
      } catch {
        return false;
      }
    });

    if (!user) {
      throw new UserNotFoundError();
    }

    const identitiesStr = attributeValue("identities", user.Attributes) ?? "[]";
    const identities = JSON.parse(identitiesStr);
    const filtered = identities.filter(
      (id: any) =>
        !(id.providerName === providerName && id.userId === providerValue),
    );

    const updatedAttributes = attributesAppend(
      user.Attributes,
      attribute("identities", filtered.length > 0 ? JSON.stringify(filtered) : ""),
    );

    await userPool.saveUser(ctx, {
      ...user,
      Attributes: updatedAttributes,
      UserLastModifiedDate: clock.get(),
    });

    return {};
  };
