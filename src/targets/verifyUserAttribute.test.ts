import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import { DateClock } from "../services/clock";
import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";

import {
  CodeMismatchError,
  InvalidParameterError,
  NotAuthorizedError,
} from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import { UserPoolService } from "../services";
import { attribute, attributesAppend } from "../services/userPoolService";
import {
  VerifyUserAttribute,
  VerifyUserAttributeTarget,
} from "./verifyUserAttribute";
import { MockUser } from "../mocks/MockUser";

const clock = new DateClock(new Date());

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
    mockUserPoolService = MockUserPoolService();
    verifyUserAttribute = VerifyUserAttribute({
      clock,
      cognito: MockCognitoService(mockUserPoolService),
    });
  });

  it("verifies the user's email", async () => {
    const user = MockUser({
      AttributeVerificationCode: "1234",
    });

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await verifyUserAttribute(MockContext, {
      AccessToken: validToken,
      AttributeName: "email",
      Code: "1234",
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(MockContext, {
      ...user,
      Attributes: attributesAppend(
        user.Attributes,
        attribute("email_verified", "true")
      ),
      UserLastModifiedDate: clock.get(),
    });
  });

  it("verifies the user's phone_number", async () => {
    const user = MockUser({
      AttributeVerificationCode: "1234",
    });

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await verifyUserAttribute(MockContext, {
      AccessToken: validToken,
      AttributeName: "phone_number",
      Code: "1234",
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(MockContext, {
      ...user,
      Attributes: attributesAppend(
        user.Attributes,
        attribute("phone_number_verified", "true")
      ),
      UserLastModifiedDate: clock.get(),
    });
  });

  it("does nothing for other attributes", async () => {
    const user = MockUser({
      AttributeVerificationCode: "1234",
    });

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await verifyUserAttribute(MockContext, {
      AccessToken: validToken,
      AttributeName: "something else",
      Code: "1234",
    });

    expect(mockUserPoolService.saveUser).not.toHaveBeenCalled();
  });

  it("throws if token isn't valid", async () => {
    await expect(
      verifyUserAttribute(MockContext, {
        AccessToken: "blah",
        AttributeName: "email",
        Code: "1234",
      })
    ).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("throws if user doesn't exist", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      verifyUserAttribute(MockContext, {
        AccessToken: validToken,
        AttributeName: "email",
        Code: "1234",
      })
    ).rejects.toEqual(new NotAuthorizedError());
  });

  it("throws if code doesn't match the user's AttributeVerificationCode", async () => {
    const user = MockUser({
      AttributeVerificationCode: "5555",
    });
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await expect(
      verifyUserAttribute(MockContext, {
        AccessToken: validToken,
        AttributeName: "email",
        Code: "1234",
      })
    ).rejects.toEqual(new CodeMismatchError());
  });
});
