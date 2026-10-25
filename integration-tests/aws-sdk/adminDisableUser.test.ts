import { describe, expect, it } from "vitest";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.adminDisableUser",
  withCognitoSdk((Cognito) => {
    it("updates a user's attributes", async () => {
      const client = Cognito();

      const pool = await client
        .createUserPool({
          PoolName: "test",
        })
        .promise();
      const userPoolId = pool.UserPool?.Id!;

      await client
        .adminCreateUser({
          UserAttributes: [
            { Name: "email", Value: "example@example.com" },
            { Name: "custom:example", Value: "1" },
          ],
          Username: "abc",
          UserPoolId: userPoolId,
          DesiredDeliveryMediums: ["EMAIL"],
        })
        .promise();

      await client
        .adminDisableUser({
          UserPoolId: userPoolId,
          Username: "abc",
        })
        .promise();

      const user = await client
        .adminGetUser({
          UserPoolId: userPoolId,
          Username: "abc",
        })
        .promise();

      expect(user.Enabled).toEqual(false);
    });

    it("refuses a disabled user's sign-in, then allows it again once enabled", async () => {
      const client = Cognito();

      const pool = await client.createUserPool({ PoolName: "test" }).promise();
      const userPoolId = pool.UserPool?.Id!;
      const upc = await client
        .createUserPoolClient({ UserPoolId: userPoolId, ClientName: "test" })
        .promise();
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
          Password: "Password1!",
          Permanent: true,
          Username: "abc",
          UserPoolId: userPoolId,
        })
        .promise();
      const signIn = () =>
        client
          .initiateAuth({
            ClientId: upc.UserPoolClient?.ClientId!,
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: { USERNAME: "abc", PASSWORD: "Password1!" },
          })
          .promise();

      await client
        .adminDisableUser({ UserPoolId: userPoolId, Username: "abc" })
        .promise();
      await expect(signIn()).rejects.toMatchObject({
        code: "NotAuthorizedException",
        message: "User is disabled.",
      });

      await client
        .adminEnableUser({ UserPoolId: userPoolId, Username: "abc" })
        .promise();
      expect((await signIn()).AuthenticationResult?.AccessToken).toBeDefined();
    });
  }),
);
