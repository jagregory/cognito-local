import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { MockLogger } from "../__tests__/mockLogger";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import * as TDB from "../__tests__/testDataBuilder";
import { InvalidParameterError, NotAuthorizedError } from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import { UserPoolService } from "../services";
import { DeleteUser, DeleteUserTarget } from "./deleteUser";

describe("DeleteUser target", () => {
  let deleteUser: DeleteUserTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    deleteUser = DeleteUser(
      {
        cognito: newMockCognitoService(mockUserPoolService),
      },
      MockLogger
    );
  });

  it("parses token get user by sub", async () => {
    const user = TDB.user();

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await deleteUser({
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

    expect(mockUserPoolService.deleteUser).toHaveBeenCalledWith(user);
  });

  it("throws if token isn't valid", async () => {
    await expect(
      deleteUser({
        AccessToken: "blah",
      })
    ).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("throws if user doesn't exist", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      deleteUser({
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
