import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { newMockTriggers } from "../__tests__/mockTriggers";
import { ClockFake } from "../__tests__/clockFake";
import * as TDB from "../__tests__/testDataBuilder";
import {
  CognitoService,
  Messages,
  Triggers,
  UserPoolService,
} from "../services";
import {
  AdminInitiateAuth,
  AdminInitiateAuthTarget,
} from "./adminInitiateAuth";
import { newMockMessages } from "../__tests__/mockMessages";

describe("AdminInitiateAuth target", () => {
  let adminInitiateAuth: AdminInitiateAuthTarget;

  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let mockCognitoService: jest.Mocked<CognitoService>;
  let mockMessages: jest.Mocked<Messages>;

  let mockTriggers: jest.Mocked<Triggers>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    mockCognitoService = newMockCognitoService(mockUserPoolService);

    mockMessages = newMockMessages();
    mockMessages.signUp.mockResolvedValue({
      emailSubject: "Mock message",
    });

    mockTriggers = newMockTriggers();

    adminInitiateAuth = AdminInitiateAuth({
      clock: new ClockFake(new Date(0)),
      triggers: mockTriggers,
      cognito: mockCognitoService,
    });
  });

  it("create tokens with username, password and admin user password auth flow", async () => {
    const existingUser = TDB.user();

    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    const response = await adminInitiateAuth({
      AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
      ClientId: "clientId",
      UserPoolId: "test",
      AuthParameters: {
        USERNAME: existingUser.Username,
        PASSWORD: existingUser.Password,
      },
    });

    expect(response.AuthenticationResult?.IdToken).toBeTruthy();
    expect(response.AuthenticationResult?.RefreshToken).toBeTruthy();
  });
});
