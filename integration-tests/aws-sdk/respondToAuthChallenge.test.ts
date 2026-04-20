import { describe, expect, it } from "vitest";
import { generate } from "../../src/services/totp";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.respondToAuthChallenge",
  withCognitoSdk((Cognito) => {
    it("handles NEW_PASSWORD_REQUIRED challenge", async () => {
      const client = Cognito();

      const pool = await client
        .createUserPool({
          PoolName: "test",
        })
        .promise();
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

      const initiateAuthResponse = await client
        .initiateAuth({
          ClientId: upc.UserPoolClient?.ClientId!,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: "abc",
            PASSWORD: "def",
          },
        })
        .promise();

      const response = await client
        .respondToAuthChallenge({
          ChallengeName: "NEW_PASSWORD_REQUIRED",
          ClientId: upc.UserPoolClient?.ClientId!,
          Session: initiateAuthResponse.Session,
          ChallengeResponses: {
            USERNAME: "abc",
            NEW_PASSWORD: "new_password",
          },
        })
        .promise();

      expect(response).toEqual({
        AuthenticationResult: {
          AccessToken: expect.any(String),
          IdToken: expect.any(String),
          RefreshToken: expect.any(String),
        },
        ChallengeParameters: {},
      });
    });

    it("handles SOFTWARE_TOKEN_MFA challenge", async () => {
      const client = Cognito();
      const pool = await client
        .createUserPool({ PoolName: "test", MfaConfiguration: "OPTIONAL" })
        .promise();
      const userPoolId = pool.UserPool?.Id!;
      await client
        .setUserPoolMfaConfig({
          UserPoolId: userPoolId,
          SoftwareTokenMfaConfiguration: { Enabled: true },
        })
        .promise();
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

      // enrol
      const firstLogin = await client
        .initiateAuth({
          ClientId: clientId,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: { USERNAME: "abc", PASSWORD: "Password1!" },
        })
        .promise();
      const accessToken = firstLogin.AuthenticationResult?.AccessToken!;
      const assoc = await client
        .associateSoftwareToken({ AccessToken: accessToken })
        .promise();
      const secret = assoc.SecretCode!;
      await client
        .verifySoftwareToken({
          AccessToken: accessToken,
          UserCode: generate(secret),
        })
        .promise();
      await client
        .setUserMFAPreference({
          AccessToken: accessToken,
          SoftwareTokenMfaSettings: { Enabled: true, PreferredMfa: true },
        })
        .promise();

      // MFA login
      const challenge = await client
        .initiateAuth({
          ClientId: clientId,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: { USERNAME: "abc", PASSWORD: "Password1!" },
        })
        .promise();

      expect(challenge.ChallengeName).toEqual("SOFTWARE_TOKEN_MFA");

      const response = await client
        .respondToAuthChallenge({
          ClientId: clientId,
          ChallengeName: "SOFTWARE_TOKEN_MFA",
          Session: challenge.Session!,
          ChallengeResponses: {
            USERNAME: "abc",
            SOFTWARE_TOKEN_MFA_CODE: generate(secret),
          },
        })
        .promise();

      expect(response.AuthenticationResult?.AccessToken).toBeDefined();

      // wrong TOTP code surfaces as CodeMismatchException through the SDK
      const nextChallenge = await client
        .initiateAuth({
          ClientId: clientId,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: { USERNAME: "abc", PASSWORD: "Password1!" },
        })
        .promise();

      await expect(
        client
          .respondToAuthChallenge({
            ClientId: clientId,
            ChallengeName: "SOFTWARE_TOKEN_MFA",
            Session: nextChallenge.Session!,
            ChallengeResponses: {
              USERNAME: "abc",
              SOFTWARE_TOKEN_MFA_CODE: "000000",
            },
          })
          .promise(),
      ).rejects.toMatchObject({
        code: "CodeMismatchException",
        message: "Incorrect confirmation code",
      });
    });

    it("rejects SELECT_MFA_TYPE with an unknown ANSWER", async () => {
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
          UserAttributes: [{ Name: "email", Value: "a@example.com" }],
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

      await expect(
        client
          .respondToAuthChallenge({
            ClientId: upc.UserPoolClient?.ClientId!,
            ChallengeName: "SELECT_MFA_TYPE",
            Session: "any-session",
            ChallengeResponses: {
              USERNAME: "abc",
              ANSWER: "BOGUS",
            },
          })
          .promise(),
      ).rejects.toMatchObject({
        code: "InvalidParameterException",
      });
    });
  }),
);
