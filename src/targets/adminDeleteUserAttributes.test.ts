import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import { NotAuthorizedError } from "../errors";
import { UserPoolService } from "../services";
import { attribute } from "../services/userPoolService";
import {
  AdminDeleteUserAttributes,
  AdminDeleteUserAttributesTarget,
} from "./adminDeleteUserAttributes";
import * as TDB from "../__tests__/testDataBuilder";

describe("AdminDeleteUserAttributes target", () => {
  let adminDeleteUserAttributes: AdminDeleteUserAttributesTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
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
      })
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
