import { describe, expect, it } from "vitest";
import { generate } from "../../src/services/totp";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.adminSetUserMFAPreference",
  withCognitoSdk((Cognito) => {
    it("turns off a user's software token MFA: the next sign-in asks for no code", async () => {
      const client = Cognito();

      const pool = await client
        .createUserPool({ PoolName: "test", MfaConfiguration: "OPTIONAL" })
        .promise();
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
      const signIn = () =>
        client
          .initiateAuth({
            ClientId: clientId,
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: { USERNAME: "abc", PASSWORD: "Password1!" },
          })
          .promise();

      const accessToken = (await signIn()).AuthenticationResult?.AccessToken!;
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
      expect((await signIn()).ChallengeName).toEqual("SOFTWARE_TOKEN_MFA");

      await client
        .adminSetUserMFAPreference({
          UserPoolId: userPoolId,
          Username: "abc",
          SoftwareTokenMfaSettings: { Enabled: false, PreferredMfa: false },
        })
        .promise();

      const user = await client
        .adminGetUser({ UserPoolId: userPoolId, Username: "abc" })
        .promise();
      expect(user.UserMFASettingList ?? []).toEqual([]);
      const after = await signIn();
      expect(after.ChallengeName).toBeUndefined();
      expect(after.AuthenticationResult?.AccessToken).toBeDefined();
    });
  }),
);
