import { DateClock } from "../services/clock";
import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";
import { NotAuthorizedError } from "../errors";
import { UserPoolService } from "../services";
import { attribute } from "../services/userPoolService";
import {
  AdminDeleteUserAttributes,
  AdminDeleteUserAttributesTarget,
} from "./adminDeleteUserAttributes";
import { MockUser } from "../models/UserModel";

describe("AdminDeleteUserAttributes target", () => {
  let adminDeleteUserAttributes: AdminDeleteUserAttributesTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let clock: DateClock;

  beforeEach(() => {
    mockUserPoolService = MockUserPoolService();
    clock = new DateClock(new Date());
    adminDeleteUserAttributes = AdminDeleteUserAttributes({
      clock,
      cognito: MockCognitoService(mockUserPoolService),
    });
  });

  it("throws if the user doesn't exist", async () => {
    await expect(
      adminDeleteUserAttributes(MockContext, {
        UserPoolId: "test",
        Username: "abc",
        UserAttributeNames: ["custom:example"],
      })
    ).rejects.toEqual(new NotAuthorizedError());
  });

  it("saves the updated attributes on the user", async () => {
    const user = MockUser({
      Attributes: [
        attribute("email", "example@example.com"),
        attribute("custom:example", "1"),
      ],
    });

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await adminDeleteUserAttributes(MockContext, {
      UserPoolId: "test",
      Username: "abc",
      UserAttributeNames: ["custom:example"],
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(MockContext, {
      ...user,
      Attributes: [attribute("email", "example@example.com")],
      UserLastModifiedDate: clock.get(),
    });
  });
});
