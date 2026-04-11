import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import PrivateKey from "../keys/cognitoLocal.private.json";
import type { UserPoolService } from "../services";
import { ConfirmDevice, type ConfirmDeviceTarget } from "./confirmDevice";

const currentDate = new Date();

const validToken = jwt.sign(
  {
    sub: "user-sub",
    client_id: "testClient",
    token_use: "access",
    username: "testuser",
  },
  PrivateKey.pem,
  { algorithm: "RS256", keyid: "CognitoLocal" },
);

describe("ConfirmDevice target", () => {
  let confirmDevice: ConfirmDeviceTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService({ Id: "test-pool" });
    confirmDevice = ConfirmDevice({
      cognito: newMockCognitoService(mockUserPoolService),
      clock: new ClockFake(currentDate),
    });
  });

  it("adds a device to the user", async () => {
    const existingUser = TDB.user({ Username: "user-sub" });
    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    const result = await confirmDevice(TestContext, {
      AccessToken: validToken,
      DeviceKey: "device-key-1",
      DeviceName: "My Phone",
    });

    expect(result.UserConfirmationNecessary).toBe(false);

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        Devices: [
          expect.objectContaining({
            DeviceKey: "device-key-1",
            DeviceCreateDate: currentDate,
          }),
        ],
      }),
    );
  });
});
