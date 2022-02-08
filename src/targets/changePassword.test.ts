import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import { DateClock } from "../services/clock";
import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";

import {
  InvalidParameterError,
  InvalidPasswordError,
  NotAuthorizedError,
} from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import { UserPoolService } from "../services";
import { ChangePassword, ChangePasswordTarget } from "./changePassword";
import { MockUser } from "../mocks/MockUser";

const currentDate = new Date();

describe("ChangePassword target", () => {
  let changePassword: ChangePasswordTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = MockUserPoolService();
    changePassword = ChangePassword({
      cognito: MockCognitoService(mockUserPoolService),
      clock: new DateClock(currentDate),
    });
  });

  it("throws if token isn't valid", async () => {
    await expect(
      changePassword(MockContext, {
        AccessToken: "blah",
        PreviousPassword: "abc",
        ProposedPassword: "def",
      })
    ).rejects.toBeInstanceOf(InvalidParameterError);

    expect(mockUserPoolService.saveUser).not.toHaveBeenCalled();
  });

  it("throws if user doesn't exist", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      changePassword(MockContext, {
        AccessToken: jwt.sign(
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
        ),
        PreviousPassword: "abc",
        ProposedPassword: "def",
      })
    ).rejects.toEqual(new NotAuthorizedError());

    expect(mockUserPoolService.saveUser).not.toHaveBeenCalled();
  });

  it("throws if previous password doesn't match", async () => {
    const user = MockUser({
      Password: "previous-password",
    });

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await expect(
      changePassword(MockContext, {
        AccessToken: jwt.sign(
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
        ),
        PreviousPassword: "abc",
        ProposedPassword: "def",
      })
    ).rejects.toEqual(new InvalidPasswordError());

    expect(mockUserPoolService.saveUser).not.toHaveBeenCalled();
  });

  it("updates the user's password if the previous password matches", async () => {
    const user = MockUser({
      Password: "previous-password",
    });

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await changePassword(MockContext, {
      AccessToken: jwt.sign(
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
      ),
      PreviousPassword: "previous-password",
      ProposedPassword: "new-password",
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(MockContext, {
      ...user,
      Password: "new-password",
      UserLastModifiedDate: currentDate,
    });
  });
});
