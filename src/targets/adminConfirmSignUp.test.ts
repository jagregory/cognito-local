import { MockClock } from "../mocks/MockClock";
import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockTriggers } from "../mocks/MockTriggers";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";
import { NotAuthorizedError } from "../errors";
import { Triggers, UserPoolService } from "../services";
import { attribute, attributesAppend } from "../services/userPoolService";
import {
  AdminConfirmSignUp,
  AdminConfirmSignUpTarget,
} from "./adminConfirmSignUp";
import { MockUser } from "../mocks/MockUser";

const currentDate = new Date();

const clock = new MockClock(currentDate);

describe("AdminConfirmSignUp target", () => {
  let adminConfirmSignUp: AdminConfirmSignUpTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let mockTriggers: jest.Mocked<Triggers>;

  beforeEach(() => {
    mockUserPoolService = MockUserPoolService();
    mockTriggers = MockTriggers();
    adminConfirmSignUp = AdminConfirmSignUp({
      clock,
      cognito: MockCognitoService(mockUserPoolService),
      triggers: mockTriggers,
    });
  });

  it("throws if the user doesn't exist", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      adminConfirmSignUp(MockContext, {
        ClientMetadata: {
          client: "metadata",
        },
        Username: "invalid user",
        UserPoolId: "test",
      })
    ).rejects.toEqual(new NotAuthorizedError());
  });

  it("updates the user's status", async () => {
    const user = MockUser();

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await adminConfirmSignUp(MockContext, {
      ClientMetadata: {
        client: "metadata",
      },
      Username: user.Username,
      UserPoolId: "test",
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(MockContext, {
      ...user,
      UserLastModifiedDate: currentDate,
      UserStatus: "CONFIRMED",
    });
  });

  describe("when PostConfirmation trigger is enabled", () => {
    it("invokes the trigger", async () => {
      mockTriggers.enabled.mockImplementation(
        (trigger) => trigger === "PostConfirmation"
      );

      const user = MockUser();

      mockUserPoolService.getUserByUsername.mockResolvedValue(user);

      await adminConfirmSignUp(MockContext, {
        ClientMetadata: {
          client: "metadata",
        },
        Username: user.Username,
        UserPoolId: "test",
      });

      expect(mockTriggers.postConfirmation).toHaveBeenCalledWith(MockContext, {
        clientId: null,
        clientMetadata: {
          client: "metadata",
        },
        source: "PostConfirmation_ConfirmSignUp",
        userAttributes: attributesAppend(
          user.Attributes,
          attribute("cognito:user_status", "CONFIRMED")
        ),
        userPoolId: "test",
        username: user.Username,
      });
    });
  });

  describe("when PostConfirmation trigger is not enabled", () => {
    it("invokes the trigger", async () => {
      mockTriggers.enabled.mockReturnValue(false);

      const user = MockUser();

      mockUserPoolService.getUserByUsername.mockResolvedValue(user);

      await adminConfirmSignUp(MockContext, {
        ClientMetadata: {
          client: "metadata",
        },
        Username: user.Username,
        UserPoolId: "test",
      });

      expect(mockTriggers.postConfirmation).not.toHaveBeenCalled();
    });
  });
});
