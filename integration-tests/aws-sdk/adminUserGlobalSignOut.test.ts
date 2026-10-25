import { describe, expect, it } from "vitest";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.adminUserGlobalSignOut",
  withCognitoSdk((Cognito) => {
    it("signs the user out everywhere: their refresh tokens stop working", async () => {
      const client = Cognito();

      const pool = await client.createUserPool({ PoolName: "test" }).promise();
      const userPoolId = pool.UserPool?.Id!;
      const upc = await client
        .createUserPoolClient({ UserPoolId: userPoolId, ClientName: "test" })
        .promise();
      const clientId = upc.UserPoolClient?.ClientId!;

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
      const signedIn = await client
        .initiateAuth({
          ClientId: clientId,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: { USERNAME: "abc", PASSWORD: "Password1!" },
        })
        .promise();
      const refresh = () =>
        client
          .initiateAuth({
            ClientId: clientId,
            AuthFlow: "REFRESH_TOKEN_AUTH",
            AuthParameters: {
              REFRESH_TOKEN: signedIn.AuthenticationResult?.RefreshToken!,
            },
          })
          .promise();
      expect((await refresh()).AuthenticationResult?.AccessToken).toBeDefined();

      await client
        .adminUserGlobalSignOut({ UserPoolId: userPoolId, Username: "abc" })
        .promise();

      await expect(refresh()).rejects.toMatchObject({
        code: "NotAuthorizedException",
      });
    });
  }),
);
