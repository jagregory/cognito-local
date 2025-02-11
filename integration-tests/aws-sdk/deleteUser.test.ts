import { UserNotFoundError } from "../../src/errors";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.deleteUser",
  withCognitoSdk((Cognito) => {
    it("deletes the current user", async () => {
      const client = Cognito();

      const pool = await client
        .createUserPool({
          PoolName: "test",
        })
        .promise();
      const userPoolId = pool.UserPool?.Id!!;

      // create the user pool client
      const upc = await client
        .createUserPoolClient({
          UserPoolId: userPoolId,
          ClientName: "test",
        })
        .promise();

      // create a user
      await client
        .adminCreateUser({
          DesiredDeliveryMediums: ["EMAIL"],
          TemporaryPassword: "def",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
          Username: "abc",
          UserPoolId: userPoolId,
        })
        .promise();

      await client
        .adminSetUserPassword({
          Password: "newPassword",
          Permanent: true,
          Username: "abc",
          UserPoolId: userPoolId,
        })
        .promise();

      // attempt to login
      const initAuthResponse = await client
        .initiateAuth({
          ClientId: upc.UserPoolClient?.ClientId!,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: "abc",
            PASSWORD: "newPassword",
          },
        })
        .promise();

      // delete the user with their token
      await client
        .deleteUser({
          AccessToken: initAuthResponse.AuthenticationResult?.AccessToken!,
        })
        .promise();

      // verify they don't exist anymore
      await expect(
        client
          .adminGetUser({
            Username: "abc",
            UserPoolId: userPoolId,
          })
          .promise()
      ).rejects.toEqual(new UserNotFoundError("User does not exist."));
    });
  })
);
