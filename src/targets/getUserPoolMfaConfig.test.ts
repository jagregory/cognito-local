import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import type { UserPoolService } from "../services";
import {
  GetUserPoolMfaConfig,
  type GetUserPoolMfaConfigTarget,
} from "./getUserPoolMfaConfig";

describe("GetUserPoolMfaConfig target", () => {
  let getUserPoolMfaConfig: GetUserPoolMfaConfigTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  const userPool = TDB.userPool({
    MfaConfiguration: "ON",
    SmsAuthenticationMessage: "hello, world!",
    SmsConfiguration: {
      ExternalId: "abc",
      SnsCallerArn: "arn",
      SnsRegion: "region",
    },
  });

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService(userPool);
    getUserPoolMfaConfig = GetUserPoolMfaConfig({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("returns the user pool's MFA config", async () => {
    const output = await getUserPoolMfaConfig(TestContext, {
      UserPoolId: "test",
    });

    expect(output).toEqual({
      MfaConfiguration: "ON",
      SmsMfaConfiguration: {
        SmsAuthenticationMessage: "hello, world!",
        SmsConfiguration: {
          ExternalId: "abc",
          SnsCallerArn: "arn",
          SnsRegion: "region",
        },
      },
      SoftwareTokenMfaConfiguration: {
        Enabled: false,
      },
    });
  });
});
