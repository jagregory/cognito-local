import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import type { UserPoolService } from "../services";
import {
  CreateIdentityProvider,
  type CreateIdentityProviderTarget,
} from "./createIdentityProvider";

const currentDate = new Date();

describe("CreateIdentityProvider target", () => {
  let createIdentityProvider: CreateIdentityProviderTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService({ Id: "test-pool" });
    createIdentityProvider = CreateIdentityProvider({
      cognito: newMockCognitoService(mockUserPoolService),
      clock: new ClockFake(currentDate),
    });
  });

  it("creates an identity provider", async () => {
    const result = await createIdentityProvider(TestContext, {
      UserPoolId: "test-pool",
      ProviderName: "Google",
      ProviderType: "Google",
      ProviderDetails: { client_id: "abc", client_secret: "xyz" },
      AttributeMapping: { email: "email" },
      IdpIdentifiers: ["google-idp"],
    });

    expect(result.IdentityProvider).toMatchObject({
      UserPoolId: "test-pool",
      ProviderName: "Google",
      ProviderType: "Google",
      ProviderDetails: { client_id: "abc", client_secret: "xyz" },
      CreationDate: currentDate,
      LastModifiedDate: currentDate,
    });

    expect(mockUserPoolService.updateOptions).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        _identityProviders: [
          expect.objectContaining({ ProviderName: "Google" }),
        ],
      }),
    );
  });
});
