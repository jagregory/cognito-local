import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import type { UserPoolService } from "../services";
import {
  SetUserPoolMfaConfig,
  type SetUserPoolMfaConfigTarget,
} from "./setUserPoolMfaConfig";

describe("SetUserPoolMfaConfig target", () => {
  let setUserPoolMfaConfig: SetUserPoolMfaConfigTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    setUserPoolMfaConfig = SetUserPoolMfaConfig({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("updates pool MfaConfiguration and returns config", async () => {
    const result = await setUserPoolMfaConfig(TestContext, {
      UserPoolId: "test",
      MfaConfiguration: "ON",
      SmsMfaConfiguration: {
        SmsAuthenticationMessage: "Your code is {####}",
        SmsConfiguration: {
          SnsCallerArn: "arn:aws:iam::123456789:role/sns-role",
        },
      },
      SoftwareTokenMfaConfiguration: {
        Enabled: true,
      },
    });

    expect(result).toEqual({
      MfaConfiguration: "ON",
      SmsMfaConfiguration: {
        SmsAuthenticationMessage: "Your code is {####}",
        SmsConfiguration: {
          SnsCallerArn: "arn:aws:iam::123456789:role/sns-role",
        },
      },
      SoftwareTokenMfaConfiguration: {
        Enabled: true,
      },
    });

    expect(mockUserPoolService.updateOptions).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        MfaConfiguration: "ON",
        SmsAuthenticationMessage: "Your code is {####}",
        SmsConfiguration: {
          SnsCallerArn: "arn:aws:iam::123456789:role/sns-role",
        },
      }),
    );
  });

  it("handles OPTIONAL MfaConfiguration", async () => {
    const result = await setUserPoolMfaConfig(TestContext, {
      UserPoolId: "test",
      MfaConfiguration: "OPTIONAL",
    });

    expect(result.MfaConfiguration).toBe("OPTIONAL");
    expect(mockUserPoolService.updateOptions).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        MfaConfiguration: "OPTIONAL",
      }),
    );
  });
});
