import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { InvalidParameterError, NotAuthorizedError } from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import type { UserPoolService } from "../services";
import { attribute } from "../services/userPoolService";
import {
  DeleteUserAttributes,
  type DeleteUserAttributesTarget,
} from "./deleteUserAttributes";

const clock = new ClockFake(new Date());

const validToken = jwt.sign(
  {
    sub: "0000-0000",
    event_id: "0",
    token_use: "access",
    scope: "aws.cognito.signin.user.admin",
    auth_time: new Date(),
    jti: uuid.v4(),
    client_id: "test",
    username: "0000-0000",
  },
  PrivateKey.pem,
  {
    algorithm: "RS256",
    issuer: `http://localhost:9229/test`,
    expiresIn: "24h",
    keyid: "CognitoLocal",
  },
);

describe("DeleteUserAttributes target", () => {
  let deleteUserAttributes: DeleteUserAttributesTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    deleteUserAttributes = DeleteUserAttributes({
      clock,
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("throws if the user doesn't exist", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      deleteUserAttributes(TestContext, {
        AccessToken: validToken,
        UserAttributeNames: ["custom:example"],
      }),
    ).rejects.toEqual(new NotAuthorizedError());
  });

  it("throws if the token is invalid", async () => {
    await expect(
      deleteUserAttributes(TestContext, {
        AccessToken: "invalid token",
        UserAttributeNames: ["custom:example"],
      }),
    ).rejects.toEqual(new InvalidParameterError());
  });

  it("saves the updated attributes on the user", async () => {
    const user = TDB.user({
      Attributes: [
        attribute("email", "example@example.com"),
        attribute("custom:example", "1"),
      ],
    });

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await deleteUserAttributes(TestContext, {
      AccessToken: validToken,
      UserAttributeNames: ["custom:example"],
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...user,
      Attributes: [attribute("email", "example@example.com")],
      UserLastModifiedDate: clock.get(),
    });
  });
});
