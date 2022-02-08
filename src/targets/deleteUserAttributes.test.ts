import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import { DateClock } from "../services/clock";
import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";
import { InvalidParameterError, NotAuthorizedError } from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import { UserPoolService } from "../services";
import { attribute } from "../services/userPoolService";
import {
  DeleteUserAttributes,
  DeleteUserAttributesTarget,
} from "./deleteUserAttributes";
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

describe("DeleteUserAttributes target", () => {
  let deleteUserAttributes: DeleteUserAttributesTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = MockUserPoolService();
    deleteUserAttributes = DeleteUserAttributes({
      clock,
      cognito: MockCognitoService(mockUserPoolService),
    });
  });

  it("throws if the user doesn't exist", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      deleteUserAttributes(MockContext, {
        AccessToken: validToken,
        UserAttributeNames: ["custom:example"],
      })
    ).rejects.toEqual(new NotAuthorizedError());
  });

  it("throws if the token is invalid", async () => {
    await expect(
      deleteUserAttributes(MockContext, {
        AccessToken: "invalid token",
        UserAttributeNames: ["custom:example"],
      })
    ).rejects.toEqual(new InvalidParameterError());
  });

  it("saves the updated attributes on the user", async () => {
    const user = MockUser({
      Attributes: [
        attribute("email", "example@example.com"),
        attribute("custom:example", "1"),
      ],
    });

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await deleteUserAttributes(MockContext, {
      AccessToken: validToken,
      UserAttributeNames: ["custom:example"],
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(MockContext, {
      ...user,
      Attributes: [attribute("email", "example@example.com")],
      UserLastModifiedDate: clock.get(),
    });
  });
});
