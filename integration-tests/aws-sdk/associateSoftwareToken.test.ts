import { describe, expect, it } from "vitest";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.associateSoftwareToken",
  withCognitoSdk((Cognito) => {
    it("returns a base32 secret for an authenticated user", async () => {
      const client = Cognito();

      const pool = await client.createUserPool({ PoolName: "test" }).promise();
      const userPoolId = pool.UserPool?.Id!;

      const upc = await client
        .createUserPoolClient({
          UserPoolId: userPoolId,
          ClientName: "test",
        })
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

      const auth = await client
        .initiateAuth({
          ClientId: upc.UserPoolClient?.ClientId!,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: { USERNAME: "abc", PASSWORD: "Password1!" },
        })
        .promise();

      const response = await client
        .associateSoftwareToken({
          AccessToken: auth.AuthenticationResult?.AccessToken!,
        })
        .promise();

      expect(response.SecretCode).toMatch(/^[A-Z2-7]+=*$/);
    });
  }),
);
