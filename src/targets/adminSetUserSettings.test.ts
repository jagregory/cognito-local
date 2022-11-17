import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { UserPoolService } from "../services";
import {
  AdminSetUserSettings,
  AdminSetUserSettingsTarget,
} from "./adminSetUserSettings";

describe("AdminSetUserSettings target", () => {
  let adminSetUserSettings: AdminSetUserSettingsTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    adminSetUserSettings = AdminSetUserSettings({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("sets the mfa options", async () => {
    const existingUser = TDB.user();

    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    await adminSetUserSettings(TestContext, {
      Username: existingUser.Username,
      UserPoolId: "test",
      MFAOptions: [{ DeliveryMedium: "SMS", AttributeName: "phone_number" }],
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...existingUser,
      MFAOptions: [{ DeliveryMedium: "SMS", AttributeName: "phone_number" }],
    });
  });

  it("sets the mfa options when nothing provided", async () => {
    const existingUser = TDB.user();

    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    await adminSetUserSettings(TestContext, {
      Username: existingUser.Username,
      UserPoolId: "test",
      MFAOptions: [],
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...existingUser,
      MFAOptions: [],
    });
  });
});
