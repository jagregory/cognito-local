import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import { newMockCognitoClient } from "../__tests__/mockCognitoClient";
import { MockLogger } from "../__tests__/mockLogger";
import { newMockUserPoolClient } from "../__tests__/mockUserPoolClient";
import * as TDB from "../__tests__/testDataBuilder";
import { InvalidParameterError, NotAuthorizedError } from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import { UserPoolClient } from "../services";
import { DeleteUser, DeleteUserTarget } from "./deleteUser";

describe("DeleteUser target", () => {
  let deleteUser: DeleteUserTarget;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;

  beforeEach(() => {
    mockUserPoolClient = newMockUserPoolClient();
    deleteUser = DeleteUser(
      {
        cognitoClient: newMockCognitoClient(mockUserPoolClient),
      },
      MockLogger
    );
  });

  it("parses token get user by sub", async () => {
    const user = TDB.user();

    mockUserPoolClient.getUserByUsername.mockResolvedValue(user);

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

    expect(mockUserPoolClient.deleteUser).toHaveBeenCalledWith(user);
  });

  it("throws if token isn't valid", async () => {
    await expect(
      deleteUser({
        AccessToken: "blah",
      })
    ).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("throws if user doesn't exist", async () => {
    mockUserPoolClient.getUserByUsername.mockResolvedValue(null);

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
