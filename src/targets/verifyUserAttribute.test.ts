import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { InvalidParameterError, NotAuthorizedError } from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import { UserPoolService } from "../services";
import { attribute, attributesAppend } from "../services/userPoolService";
import {
  VerifyUserAttribute,
  VerifyUserAttributeTarget,
} from "./verifyUserAttribute";

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
  }
);

describe("VerifyUserAttribute target", () => {
  let verifyUserAttribute: VerifyUserAttributeTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    verifyUserAttribute = VerifyUserAttribute({
      clock,
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("verifies the user's email", async () => {
    const user = TDB.user({
      AttributeVerificationCode: "1234",
    });

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await verifyUserAttribute(TestContext, {
      AccessToken: validToken,
      AttributeName: "email",
      Code: "1234",
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...user,
      Attributes: attributesAppend(
        user.Attributes,
        attribute("email_verified", "true")
      ),
      UserLastModifiedDate: clock.get(),
    });
  });

  it("verifies the user's phone_number", async () => {
    const user = TDB.user({
      AttributeVerificationCode: "1234",
    });

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await verifyUserAttribute(TestContext, {
      AccessToken: validToken,
      AttributeName: "phone_number",
      Code: "1234",
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...user,
      Attributes: attributesAppend(
        user.Attributes,
        attribute("phone_number_verified", "true")
      ),
      UserLastModifiedDate: clock.get(),
    });
  });

  it("does nothing for other attributes", async () => {
    const user = TDB.user({
      AttributeVerificationCode: "1234",
    });

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await verifyUserAttribute(TestContext, {
      AccessToken: validToken,
      AttributeName: "something else",
      Code: "1234",
    });

    expect(mockUserPoolService.saveUser).not.toHaveBeenCalled();
  });

  it("throws if token isn't valid", async () => {
    await expect(
      verifyUserAttribute(TestContext, {
        AccessToken: "blah",
        AttributeName: "email",
        Code: "1234",
      })
    ).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("throws if user doesn't exist", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      verifyUserAttribute(TestContext, {
        AccessToken: validToken,
        AttributeName: "email",
        Code: "1234",
      })
    ).rejects.toEqual(new NotAuthorizedError());
  });

  it("throws if code doesn't match the user's AttributeVerificationCode", async () => {
    const user = TDB.user({
      AttributeVerificationCode: "5555",
    });
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await expect(
      verifyUserAttribute(TestContext, {
        AccessToken: validToken,
        AttributeName: "email",
        Code: "1234",
      })
    ).rejects.toEqual(
      new InvalidParameterError(
        "Unable to verify attribute: email no value set to verify"
      )
    );
  });
});
