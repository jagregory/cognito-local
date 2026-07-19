import type AWS from "aws-sdk";
import { describe, expect, it } from "vitest";
import { ClockFake } from "../../src/__tests__/clockFake";
import { generate } from "../../src/services/totp";
import { withCognitoSdk } from "./setup";

const createRequiredMfaUser = async (
  client: AWS.CognitoIdentityServiceProvider,
) => {
  const pool = await client
    .createUserPool({ MfaConfiguration: "ON", PoolName: "test" })
    .promise();
  const userPoolId = pool.UserPool?.Id as string;
  await client
    .setUserPoolMfaConfig({
      MfaConfiguration: "ON",
      SoftwareTokenMfaConfiguration: { Enabled: true },
      UserPoolId: userPoolId,
    })
    .promise();
  const appClient = await client
    .createUserPoolClient({ ClientName: "test", UserPoolId: userPoolId })
    .promise();
  const clientId = appClient.UserPoolClient?.ClientId as string;

  await client
    .adminCreateUser({
      DesiredDeliveryMediums: ["EMAIL"],
      TemporaryPassword: "temporary",
      UserAttributes: [{ Name: "email", Value: "user@example.com" }],
      Username: "user",
      UserPoolId: userPoolId,
    })
    .promise();
  await client
    .adminSetUserPassword({
      Password: "Password1!",
      Permanent: true,
      Username: "user",
      UserPoolId: userPoolId,
    })
    .promise();

  return { clientId, userPoolId };
};

describe(
  "MFA_SETUP forced enrollment",
  withCognitoSdk((Cognito) => {
    it("completes password enrollment, rejects replay, and honors admin preferences", async () => {
      const client = Cognito();
      const { clientId, userPoolId } = await createRequiredMfaUser(client);

      const challenge = await client
        .initiateAuth({
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            PASSWORD: "Password1!",
            USERNAME: "user",
          },
          ClientId: clientId,
        })
        .promise();

      expect(challenge).toMatchObject({
        ChallengeName: "MFA_SETUP",
        ChallengeParameters: {
          MFAS_CAN_SETUP: JSON.stringify(["SOFTWARE_TOKEN_MFA"]),
          USER_ID_FOR_SRP: "user",
        },
        Session: expect.any(String),
      });

      const associated = await client
        .associateSoftwareToken({ Session: challenge.Session })
        .promise();
      expect(associated.Session).not.toEqual(challenge.Session);

      await expect(
        client.associateSoftwareToken({ Session: challenge.Session }).promise(),
      ).rejects.toMatchObject({
        code: "NotAuthorizedException",
        message: "Invalid session for the user.",
      });

      const verified = await client
        .verifySoftwareToken({
          Session: associated.Session,
          UserCode: generate(associated.SecretCode as string),
        })
        .promise();
      expect(verified.Session).not.toEqual(associated.Session);

      await expect(
        client
          .verifySoftwareToken({
            Session: associated.Session,
            UserCode: generate(associated.SecretCode as string),
          })
          .promise(),
      ).rejects.toMatchObject({
        code: "NotAuthorizedException",
        message: "Invalid session for the user.",
      });

      const completed = await client
        .respondToAuthChallenge({
          ChallengeName: "MFA_SETUP",
          ChallengeResponses: { USERNAME: "user" },
          ClientId: clientId,
          Session: verified.Session,
        })
        .promise();
      expect(completed.AuthenticationResult?.AccessToken).toBeDefined();

      await expect(
        client
          .respondToAuthChallenge({
            ChallengeName: "MFA_SETUP",
            ChallengeResponses: { USERNAME: "user" },
            ClientId: clientId,
            Session: verified.Session,
          })
          .promise(),
      ).rejects.toMatchObject({
        code: "NotAuthorizedException",
        message: "Invalid session for the user.",
      });

      const nextLogin = await client
        .initiateAuth({
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            PASSWORD: "Password1!",
            USERNAME: "user",
          },
          ClientId: clientId,
        })
        .promise();
      expect(nextLogin.ChallengeName).toEqual("SOFTWARE_TOKEN_MFA");

      const authenticated = await client
        .respondToAuthChallenge({
          ChallengeName: "SOFTWARE_TOKEN_MFA",
          ChallengeResponses: {
            SOFTWARE_TOKEN_MFA_CODE: generate(associated.SecretCode as string),
            USERNAME: "user",
          },
          ClientId: clientId,
          Session: nextLogin.Session,
        })
        .promise();
      expect(authenticated.AuthenticationResult?.AccessToken).toBeDefined();

      await client
        .adminSetUserMFAPreference({
          SoftwareTokenMfaSettings: { Enabled: false },
          Username: "user",
          UserPoolId: userPoolId,
        })
        .promise();
      const disabledLogin = await client
        .initiateAuth({
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            PASSWORD: "Password1!",
            USERNAME: "user",
          },
          ClientId: clientId,
        })
        .promise();
      expect(disabledLogin.ChallengeName).toEqual("MFA_SETUP");

      await client
        .adminSetUserMFAPreference({
          SoftwareTokenMfaSettings: { Enabled: true, PreferredMfa: true },
          Username: "user",
          UserPoolId: userPoolId,
        })
        .promise();
      const reenabledLogin = await client
        .initiateAuth({
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            PASSWORD: "Password1!",
            USERNAME: "user",
          },
          ClientId: clientId,
        })
        .promise();
      expect(reenabledLogin.ChallengeName).toEqual("SOFTWARE_TOKEN_MFA");
    });

    it("continues from PASSWORD_VERIFIER into forced enrollment", async () => {
      const client = Cognito();
      const { clientId } = await createRequiredMfaUser(client);

      const srp = await client
        .initiateAuth({
          AuthFlow: "USER_SRP_AUTH",
          AuthParameters: { SRP_A: "local", USERNAME: "user" },
          ClientId: clientId,
        })
        .promise();
      expect(srp.ChallengeName).toEqual("PASSWORD_VERIFIER");

      const setup = await client
        .respondToAuthChallenge({
          ChallengeName: "PASSWORD_VERIFIER",
          ChallengeResponses: {
            PASSWORD_CLAIM_SECRET_BLOCK: srp.ChallengeParameters
              ?.SECRET_BLOCK as string,
            TIMESTAMP: new Date().toISOString(),
            USERNAME: "user",
          },
          ClientId: clientId,
        })
        .promise();
      expect(setup.ChallengeName).toEqual("MFA_SETUP");

      const associated = await client
        .associateSoftwareToken({ Session: setup.Session })
        .promise();
      const verified = await client
        .verifySoftwareToken({
          Session: associated.Session,
          UserCode: generate(associated.SecretCode as string),
        })
        .promise();
      const completed = await client
        .respondToAuthChallenge({
          ChallengeName: "MFA_SETUP",
          ChallengeResponses: { USERNAME: "user" },
          ClientId: clientId,
          Session: verified.Session,
        })
        .promise();

      expect(completed.AuthenticationResult?.AccessToken).toBeDefined();
    });
  }),
);

const clock = new ClockFake(new Date("2025-01-01T00:00:00.000Z"));

describe(
  "MFA_SETUP session expiry",
  withCognitoSdk(
    (Cognito) => {
      it("rejects an enrollment session after three minutes", async () => {
        const client = Cognito();
        const { clientId } = await createRequiredMfaUser(client);
        const challenge = await client
          .initiateAuth({
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: {
              PASSWORD: "Password1!",
              USERNAME: "user",
            },
            ClientId: clientId,
          })
          .promise();

        clock.advanceBy(3 * 60 * 1000);

        await expect(
          client
            .associateSoftwareToken({ Session: challenge.Session })
            .promise(),
        ).rejects.toMatchObject({
          code: "NotAuthorizedException",
          message: "Invalid session for the user.",
        });
      });
    },
    { clock },
  ),
);
