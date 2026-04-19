import { describe, expect, it } from "vitest";
import { generate } from "../../src/services/totp";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.setUserMFAPreference",
  withCognitoSdk((Cognito) => {
    it("enables and prefers software token MFA once verified", async () => {
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
      await client
        .verifySoftwareToken({
          AccessToken: accessToken,
          UserCode: generate(associate.SecretCode!),
        })
        .promise();

      await client
        .setUserMFAPreference({
          AccessToken: accessToken,
          SoftwareTokenMfaSettings: { Enabled: true, PreferredMfa: true },
        })
        .promise();

      const getUser = await client
        .adminGetUser({ UserPoolId: userPoolId, Username: "abc" })
        .promise();

      expect(getUser.UserMFASettingList).toEqual(["SOFTWARE_TOKEN_MFA"]);
      expect(getUser.PreferredMfaSetting).toEqual("SOFTWARE_TOKEN_MFA");
    });

    it("rejects enabling software token MFA without a verified secret", async () => {
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

      await expect(
        client
          .setUserMFAPreference({
            AccessToken: auth.AuthenticationResult?.AccessToken!,
            SoftwareTokenMfaSettings: { Enabled: true },
          })
          .promise(),
      ).rejects.toMatchObject({
        code: "InvalidParameterException",
        message: "User has not verified software token MFA",
      });
    });
  }),
);
