import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { NotAuthorizedError } from "../errors";
import type { UserPoolService } from "../services";
import { attribute } from "../services/userPoolService";
import {
  AdminDeleteUserAttributes,
  type AdminDeleteUserAttributesTarget,
} from "./adminDeleteUserAttributes";

describe("AdminDeleteUserAttributes target", () => {
  let adminDeleteUserAttributes: AdminDeleteUserAttributesTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;
  let clock: ClockFake;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    clock = new ClockFake(new Date());
    adminDeleteUserAttributes = AdminDeleteUserAttributes({
      clock,
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("throws if the user doesn't exist", async () => {
    await expect(
      adminDeleteUserAttributes(TestContext, {
        UserPoolId: "test",
        Username: "abc",
        UserAttributeNames: ["custom:example"],
      }),
    ).rejects.toEqual(new NotAuthorizedError());
  });

  it("saves the updated attributes on the user", async () => {
    const user = TDB.user({
      Attributes: [
        attribute("email", "example@example.com"),
        attribute("custom:example", "1"),
      ],
    });

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await adminDeleteUserAttributes(TestContext, {
      UserPoolId: "test",
      Username: "abc",
      UserAttributeNames: ["custom:example"],
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...user,
      Attributes: [attribute("email", "example@example.com")],
      UserLastModifiedDate: clock.get(),
    });
  });
});
