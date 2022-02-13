import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";

import { InvalidParameterError, NotAuthorizedError } from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import { UserPoolService } from "../services";
import { DeleteUser, DeleteUserTarget } from "./deleteUser";
import { MockUser } from "../models/UserModel";

describe("DeleteUser target", () => {
  let deleteUser: DeleteUserTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = MockUserPoolService();
    deleteUser = DeleteUser({
      cognito: MockCognitoService(mockUserPoolService),
    });
  });

  it("parses token get user by sub", async () => {
    const user = MockUser();

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await deleteUser(MockContext, {
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
    });

    expect(mockUserPoolService.deleteUser).toHaveBeenCalledWith(
      MockContext,
      user
    );
  });

  it("throws if token isn't valid", async () => {
    await expect(
      deleteUser(MockContext, {
        AccessToken: "blah",
      })
    ).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("throws if user doesn't exist", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      deleteUser(MockContext, {
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
      })
    ).rejects.toEqual(new NotAuthorizedError());
  });
});
