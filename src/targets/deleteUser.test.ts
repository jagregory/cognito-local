import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import { newMockCognitoClient } from "../__tests__/mockCognitoClient";
import { MockLogger } from "../__tests__/mockLogger";
import { MockUserPoolClient } from "../__tests__/mockUserPoolClient";
import { InvalidParameterError, NotAuthorizedError } from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import { CognitoClient } from "../services";
import { DeleteUser, DeleteUserTarget } from "./deleteUser";
import * as TDB from "../__tests__/testDataBuilder";

describe("DeleteUser target", () => {
  let deleteUser: DeleteUserTarget;
  let mockCognitoClient: jest.Mocked<CognitoClient>;

  beforeEach(() => {
    mockCognitoClient = newMockCognitoClient();

    deleteUser = DeleteUser(
      {
        cognitoClient: mockCognitoClient,
      },
      MockLogger
    );
  });

  it("parses token get user by sub", async () => {
    const user = TDB.user();

    MockUserPoolClient.getUserByUsername.mockResolvedValue(user);

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

    expect(MockUserPoolClient.deleteUser).toHaveBeenCalledWith(user);
  });

  it("throws if token isn't valid", async () => {
    await expect(
      deleteUser({
        AccessToken: "blah",
      })
    ).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("throws if user doesn't exist", async () => {
    MockUserPoolClient.getUserByUsername.mockResolvedValue(null);

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
