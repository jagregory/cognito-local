import { DateClock } from "../services/clock";
import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";

import { UserNotFoundError } from "../errors";
import { UserPoolService } from "../services";
import {
  AdminSetUserPassword,
  AdminSetUserPasswordTarget,
} from "./adminSetUserPassword";
import { MockUser } from "../models/UserModel";

describe("AdminSetUser target", () => {
  let adminSetUserPassword: AdminSetUserPasswordTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let clock: DateClock;

  beforeEach(() => {
    mockUserPoolService = MockUserPoolService();
    clock = new DateClock(new Date());
    adminSetUserPassword = AdminSetUserPassword({
      cognito: MockCognitoService(mockUserPoolService),
      clock,
    });
  });

  it("sets a new temporary password by default", async () => {
    const existingUser = MockUser();

    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    const newDate = clock.advanceBy(1200);

    await adminSetUserPassword(MockContext, {
      Username: existingUser.Username,
      UserPoolId: "test",
      Password: "newPassword",
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(MockContext, {
      ...existingUser,
      Password: "newPassword",
      UserLastModifiedDate: newDate,
      UserStatus: "FORCE_CHANGE_PASSWORD",
    });
  });

  it("sets a new temporary password explicitly", async () => {
    const existingUser = MockUser();

    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    const newDate = clock.advanceBy(1200);

    await adminSetUserPassword(MockContext, {
      Username: existingUser.Username,
      UserPoolId: "test",
      Password: "newPassword",
      Permanent: false,
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(MockContext, {
      ...existingUser,
      Password: "newPassword",
      UserLastModifiedDate: newDate,
      UserStatus: "FORCE_CHANGE_PASSWORD",
    });
  });

  it("sets a permanent temporary password", async () => {
    const existingUser = MockUser();

    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    const newDate = clock.advanceBy(1200);

    await adminSetUserPassword(MockContext, {
      Username: existingUser.Username,
      UserPoolId: "test",
      Password: "newPassword",
      Permanent: true,
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(MockContext, {
      ...existingUser,
      Password: "newPassword",
      UserLastModifiedDate: newDate,
      UserStatus: "CONFIRMED",
    });
  });

  it("handles trying to set a password for an invalid user", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      adminSetUserPassword(MockContext, {
        Password: "Password",
        Username: "Username",
        UserPoolId: "test",
      })
    ).rejects.toEqual(new UserNotFoundError("User does not exist"));
  });
});
