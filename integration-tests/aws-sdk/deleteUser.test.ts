import { UUID } from "../../src/__tests__/patterns";
import { UserNotFoundError } from "../../src/errors";
import { attributeValue } from "../../src/services/userPoolClient";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.deleteUser",
  withCognitoSdk((Cognito) => {
    it("deletes the current user", async () => {
      const client = Cognito();

      // create the user pool client
      const upc = await client
        .createUserPoolClient({
          UserPoolId: "test",
          ClientName: "test",
        })
        .promise();

      // create a user
      const createUserResponse = await client
        .adminCreateUser({
          TemporaryPassword: "def",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
          Username: "abc",
          UserPoolId: "test",
        })
        .promise();
      const userSub = attributeValue(
        "sub",
        createUserResponse.User?.Attributes
      );

      // attempt to login
      const initAuthResponse = await client
        .initiateAuth({
          ClientId: upc.UserPoolClient?.ClientId!,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: "abc",
            PASSWORD: "def",
          },
        })
        .promise();

      // change their password on first login
      // TODO: replace this with adminSetPassword when it's supported
      const respondToAuthChallengeResult = await client
        .respondToAuthChallenge({
          ChallengeName: "NEW_PASSWORD_REQUIRED",
          Session: initAuthResponse.Session,
          ChallengeResponses: {
            USERNAME: "abc",
            NEW_PASSWORD: "new_password",
          },
          ClientId: upc.UserPoolClient?.ClientId!,
        })
        .promise();

      // delete the user with their token
      await client
        .deleteUser({
          AccessToken: respondToAuthChallengeResult.AuthenticationResult
            ?.AccessToken!,
        })
        .promise();

      // verify they don't exist anymore
      await expect(
        client
          .adminGetUser({
            Username: "abc",
            UserPoolId: "test",
          })
          .promise()
      ).rejects.toEqual(new UserNotFoundError("User does not exist"));
    });
  })
);
