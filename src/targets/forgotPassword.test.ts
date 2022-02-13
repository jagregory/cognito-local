import { DateClock } from "../services/clock";
import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockMessages } from "../mocks/MockMessages";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";
import { UserNotFoundError } from "../errors";
import { Messages, UserPoolService } from "../services";
import { attributeValue } from "../services/userPoolService";
import { ForgotPassword, ForgotPasswordTarget } from "./forgotPassword";
import { MockUser } from "../models/UserModel";

const currentDate = new Date();

describe("ForgotPassword target", () => {
  let forgotPassword: ForgotPasswordTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let mockMessages: jest.Mocked<Messages>;
  let mockOtp: jest.MockedFunction<() => string>;

  beforeEach(() => {
    mockUserPoolService = MockUserPoolService();
    mockMessages = MockMessages();
    mockOtp = jest.fn().mockReturnValue("1234");
    forgotPassword = ForgotPassword({
      cognito: MockCognitoService(mockUserPoolService),
      clock: new DateClock(currentDate),
      messages: mockMessages,
      otp: mockOtp,
    });
  });

  it("throws if user doesn't exist", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      forgotPassword(MockContext, {
        ClientId: "clientId",
        Username: "0000-0000",
      })
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it("sends a confirmation code to the user's email address", async () => {
    const user = MockUser();

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    const result = await forgotPassword(MockContext, {
      ClientId: "clientId",
      Username: user.Username,
      ClientMetadata: { client: "metadata" },
    });

    expect(mockMessages.deliver).toHaveBeenCalledWith(
      MockContext,
      "ForgotPassword",
      "clientId",
      "test",
      user,
      "1234",
      { client: "metadata" },
      {
        AttributeName: "email",
        DeliveryMedium: "EMAIL",
        Destination: attributeValue("email", user.Attributes),
      }
    );

    expect(result).toEqual({
      CodeDeliveryDetails: {
        AttributeName: "email",
        DeliveryMedium: "EMAIL",
        Destination: attributeValue("email", user.Attributes),
      },
    });
  });

  it("saves the confirmation code on the user for comparison when confirming", async () => {
    const user = MockUser();

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await forgotPassword(MockContext, {
      ClientId: "clientId",
      Username: user.Username,
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(MockContext, {
      ...user,
      UserLastModifiedDate: currentDate,
      ConfirmationCode: "1234",
    });
  });
});
