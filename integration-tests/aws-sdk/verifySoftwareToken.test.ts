import { describe, expect, it } from "vitest";
import { generate } from "../../src/services/totp";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.verifySoftwareToken",
  withCognitoSdk((Cognito) => {
    it("verifies a generated TOTP code", async () => {
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

      const auth = await client
        .initiateAuth({
          ClientId: upc.UserPoolClient?.ClientId!,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: { USERNAME: "abc", PASSWORD: "Password1!" },
        })
        .promise();
      const accessToken = auth.AuthenticationResult?.AccessToken!;

      const associate = await client
        .associateSoftwareToken({ AccessToken: accessToken })
        .promise();

      const verifyOk = await client
        .verifySoftwareToken({
          AccessToken: accessToken,
          UserCode: generate(associate.SecretCode!),
          FriendlyDeviceName: "Phone",
        })
        .promise();

      expect(verifyOk.Status).toEqual("SUCCESS");

      await expect(
        client
          .verifySoftwareToken({
            AccessToken: accessToken,
            UserCode: "000000",
          })
          .promise(),
      ).rejects.toThrow(/Incorrect confirmation code/);
    });
  }),
);
