import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { ResourceNotFoundError } from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import type { UserPoolService } from "../services";
import { GetDevice, type GetDeviceTarget } from "./getDevice";

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

const now = new Date();

describe("GetDevice target", () => {
  let getDevice: GetDeviceTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService({ Id: "test-pool" });
    getDevice = GetDevice({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("returns the device", async () => {
    const existingUser = TDB.user({ Username: "user-sub" });
    existingUser.Devices = [
      {
        DeviceKey: "device-key-1",
        DeviceAttributes: [{ Name: "device_name", Value: "My Phone" }],
        DeviceCreateDate: now,
        DeviceLastModifiedDate: now,
        DeviceLastAuthenticatedDate: now,
      },
    ];
    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    const result = await getDevice(TestContext, {
      AccessToken: validToken,
      DeviceKey: "device-key-1",
    });

    expect(result.Device).toMatchObject({
      DeviceKey: "device-key-1",
    });
  });

  it("throws if device not found", async () => {
    const existingUser = TDB.user({ Username: "user-sub" });
    existingUser.Devices = [];
    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    await expect(
      getDevice(TestContext, {
        AccessToken: validToken,
        DeviceKey: "nonexistent-device",
      }),
    ).rejects.toEqual(new ResourceNotFoundError("Device not found."));
  });
});
