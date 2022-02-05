import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockMessages } from "../mocks/MockMessages";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import { Messages, UserPoolService } from "../services";
import { attribute, attributeValue } from "../services/userPoolService";
import {
  GetUserAttributeVerificationCode,
  GetUserAttributeVerificationCodeTarget,
} from "./getUserAttributeVerificationCode";
import { MockUser } from "../mocks/MockUser";

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

describe("GetUserAttributeVerificationCode target", () => {
  let getUserAttributeVerificationCode: GetUserAttributeVerificationCodeTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let mockMessages: jest.Mocked<Messages>;

  beforeEach(() => {
    mockUserPoolService = MockUserPoolService({
      Id: "test",
      AutoVerifiedAttributes: ["email"],
    });
    mockMessages = MockMessages();
    getUserAttributeVerificationCode = GetUserAttributeVerificationCode({
      cognito: MockCognitoService(mockUserPoolService),
      messages: mockMessages,
      otp: () => "1234",
    });
  });

  it("throws if token isn't valid", async () => {
    await expect(
      getUserAttributeVerificationCode(MockContext, {
        AccessToken: "blah",
        AttributeName: "email",
      })
    ).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("throws if user doesn't exist", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      getUserAttributeVerificationCode(MockContext, {
        AccessToken: validToken,
        AttributeName: "email",
      })
    ).rejects.toEqual(new UserNotFoundError());
  });

  it("throws if the user doesn't have a valid way to contact them", async () => {
    const user = MockUser({
      Attributes: [],
    });

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await expect(
      getUserAttributeVerificationCode(MockContext, {
        ClientMetadata: {
          client: "metadata",
        },
        AccessToken: validToken,
        AttributeName: "email",
      })
    ).rejects.toEqual(
      new InvalidParameterError(
        "User has no attribute matching desired auto verified attributes"
      )
    );
  });

  it("delivers a OTP code to the user", async () => {
    const user = MockUser({
      Attributes: [attribute("email", "example@example.com")],
    });

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await getUserAttributeVerificationCode(MockContext, {
      ClientMetadata: {
        client: "metadata",
      },
      AccessToken: validToken,
      AttributeName: "email",
    });

    expect(mockMessages.deliver).toHaveBeenCalledWith(
      MockContext,
      "VerifyUserAttribute",
      null,
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

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
      MockContext,
      expect.objectContaining({
        AttributeVerificationCode: "1234",
      })
    );
  });
});
