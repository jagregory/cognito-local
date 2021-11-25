import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoClient } from "../__tests__/mockCognitoClient";
import { newMockUserPoolClient } from "../__tests__/mockUserPoolClient";
import * as TDB from "../__tests__/testDataBuilder";
import { UserNotFoundError } from "../errors";
import { UserPoolClient } from "../services";
import {
  AdminSetUserPassword,
  AdminSetUserPasswordTarget,
} from "./adminSetUserPassword";

describe("AdminSetUser target", () => {
  let adminSetUserPassword: AdminSetUserPasswordTarget;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;
  let clock: ClockFake;

  beforeEach(() => {
    mockUserPoolClient = newMockUserPoolClient();
    clock = new ClockFake(new Date());
    adminSetUserPassword = AdminSetUserPassword({
      cognitoClient: newMockCognitoClient(mockUserPoolClient),
      clock,
    });
  });

  it("sets a new temporary password by default", async () => {
    const existingUser = TDB.user();

    mockUserPoolClient.getUserByUsername.mockResolvedValue(existingUser);

    const newDate = clock.advanceBy(1200);

    await adminSetUserPassword({
      Username: existingUser.Username,
      UserPoolId: "test",
      Password: "newPassword",
    });

    expect(mockUserPoolClient.saveUser).toHaveBeenCalledWith({
      ...existingUser,
      Password: "newPassword",
      UserLastModifiedDate: newDate.getTime(),
      UserStatus: "FORCE_CHANGE_PASSWORD",
    });
  });

  it("sets a new temporary password explicitly", async () => {
    const existingUser = TDB.user();

    mockUserPoolClient.getUserByUsername.mockResolvedValue(existingUser);

    const newDate = clock.advanceBy(1200);

    await adminSetUserPassword({
      Username: existingUser.Username,
      UserPoolId: "test",
      Password: "newPassword",
      Permanent: false,
    });

    expect(mockUserPoolClient.saveUser).toHaveBeenCalledWith({
      ...existingUser,
      Password: "newPassword",
      UserLastModifiedDate: newDate.getTime(),
      UserStatus: "FORCE_CHANGE_PASSWORD",
    });
  });

  it("sets a permanent temporary password", async () => {
    const existingUser = TDB.user();

    mockUserPoolClient.getUserByUsername.mockResolvedValue(existingUser);

    const newDate = clock.advanceBy(1200);

    await adminSetUserPassword({
      Username: existingUser.Username,
      UserPoolId: "test",
      Password: "newPassword",
      Permanent: true,
    });

    expect(mockUserPoolClient.saveUser).toHaveBeenCalledWith({
      ...existingUser,
      Password: "newPassword",
      UserLastModifiedDate: newDate.getTime(),
      UserStatus: "CONFIRMED",
    });
  });

  it("handles trying to set a password for an invalid user", async () => {
    mockUserPoolClient.getUserByUsername.mockResolvedValue(null);

    await expect(
      adminSetUserPassword({
        Password: "Password",
        Username: "Username",
        UserPoolId: "test",
      })
    ).rejects.toEqual(new UserNotFoundError("User does not exist"));
  });
});
