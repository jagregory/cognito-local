import type {
  AdminLinkProviderForUserRequest,
  AdminLinkProviderForUserResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { UserNotFoundError } from "../errors";
import type { Services } from "../services";
import { attributesAppend, attribute } from "../services/userPoolService";
import type { Target } from "./Target";

export type AdminLinkProviderForUserTarget = Target<
  AdminLinkProviderForUserRequest,
  AdminLinkProviderForUserResponse
>;

type AdminLinkProviderForUserServices = Pick<Services, "cognito" | "clock">;

export const AdminLinkProviderForUser =
  ({
    cognito,
    clock,
  }: AdminLinkProviderForUserServices): AdminLinkProviderForUserTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPool(ctx, req.UserPoolId);
    const user = await userPool.getUserByUsername(
      ctx,
      req.DestinationUser?.ProviderAttributeValue ?? "",
    );
    if (!user) {
      throw new UserNotFoundError();
    }

    const providerName = req.SourceUser?.ProviderName ?? "";
    const providerValue = req.SourceUser?.ProviderAttributeValue ?? "";

    const updatedAttributes = attributesAppend(
      user.Attributes,
      attribute(`identities`, JSON.stringify([
        {
          providerName,
          providerType: providerName,
          userId: providerValue,
          primary: false,
          dateCreated: clock.get().getTime(),
        },
      ])),
    );

    await userPool.saveUser(ctx, {
      ...user,
      Attributes: updatedAttributes,
      UserLastModifiedDate: clock.get(),
    });

    return {};
  };
