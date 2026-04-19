import jwt from "jsonwebtoken";
import { describe, expect, it, vi } from "vitest";
import type { Lambda } from "../../src/services/lambda";
import { withCognitoSdk } from "./setup";

// A V2 Lambda mock that echoes the recorded invocation so each test can assert on what cognito-local
// sent and control the returned claimsAndScopeOverrideDetails.
const makeV2Lambda = (
  response: unknown,
): {
  lambda: Lambda;
  invocations: Array<{ trigger: string; event: unknown }>;
} => {
  const invocations: Array<{ trigger: string; event: unknown }> = [];
  const lambda: Lambda = {
    enabled: (name) => name === "PreTokenGenerationV2",
    invoke: vi.fn(async (_ctx, trigger, event) => {
      invocations.push({ trigger, event });
      return response as never;
    }),
  };
  return { lambda, invocations };
};

const makeV1Lambda = (
  response: unknown,
): {
  lambda: Lambda;
  invocations: Array<{ trigger: string; event: unknown }>;
} => {
  const invocations: Array<{ trigger: string; event: unknown }> = [];
  const lambda: Lambda = {
    enabled: (name) => name === "PreTokenGeneration",
    invoke: vi.fn(async (_ctx, trigger, event) => {
      invocations.push({ trigger, event });
      return response as never;
    }),
  };
  return { lambda, invocations };
};

describe("Pre Token Generation V2 over AWS SDK", () => {
  describe(
    "V2 trigger injects claims into both access and id tokens",
    withCognitoSdk(
      (Cognito) => {
        it("applies access-token-specific and id-token-specific claim overrides", async () => {
          const client = Cognito();

          const pool = await client
            .createUserPool({ PoolName: "test" })
            .promise();
          const userPoolId = pool.UserPool?.Id!;

          const upc = await client
            .createUserPoolClient({
              UserPoolId: userPoolId,
              ClientName: "test",
              ExplicitAuthFlows: ["ADMIN_USER_PASSWORD_AUTH"],
            })
            .promise();
          const clientId = upc.UserPoolClient?.ClientId!;

          await client
            .adminCreateUser({
              Username: "abc",
              TemporaryPassword: "Temp123!",
              UserAttributes: [
                { Name: "email", Value: "abc@example.com" },
                { Name: "email_verified", Value: "true" },
              ],
              MessageAction: "SUPPRESS",
              UserPoolId: userPoolId,
            })
            .promise();

          await client
            .adminSetUserPassword({
              UserPoolId: userPoolId,
              Username: "abc",
              Password: "Password1!",
              Permanent: true,
            })
            .promise();

          const response = await client
            .adminInitiateAuth({
              UserPoolId: userPoolId,
              ClientId: clientId,
              AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
              AuthParameters: {
                USERNAME: "abc",
                PASSWORD: "Password1!",
              },
            })
            .promise();

          const accessToken = jwt.decode(
            response.AuthenticationResult?.AccessToken!,
          ) as Record<string, unknown>;
          const idToken = jwt.decode(
            response.AuthenticationResult?.IdToken!,
          ) as Record<string, unknown>;

          expect(accessToken).toMatchObject({
            "custom:tenantId": "acme",
            "custom:permissions": "read,write",
            "custom:perm_ver": "3",
          });
          // access-token-only claims should NOT appear on the id token
          expect(idToken).not.toMatchObject({
            "custom:permissions": "read,write",
          });
          expect(idToken).toMatchObject({
            "custom:tenantId": "acme",
            "custom:userId": "user-42",
          });
        });
      },
      {
        lambda: makeV2Lambda({
          claimsAndScopeOverrideDetails: {
            accessTokenGeneration: {
              claimsToAddOrOverride: {
                "custom:tenantId": "acme",
                "custom:permissions": "read,write",
                "custom:perm_ver": "3",
              },
            },
            idTokenGeneration: {
              claimsToAddOrOverride: {
                "custom:tenantId": "acme",
                "custom:userId": "user-42",
              },
            },
          },
        }).lambda,
      },
    ),
  );

  describe(
    "V1 trigger still applies to id token only (regression)",
    withCognitoSdk(
      (Cognito) => {
        it("only the id token receives overrides", async () => {
          const client = Cognito();

          const pool = await client
            .createUserPool({ PoolName: "test" })
            .promise();
          const userPoolId = pool.UserPool?.Id!;

          const upc = await client
            .createUserPoolClient({
              UserPoolId: userPoolId,
              ClientName: "test",
              ExplicitAuthFlows: ["ADMIN_USER_PASSWORD_AUTH"],
            })
            .promise();
          const clientId = upc.UserPoolClient?.ClientId!;

          await client
            .adminCreateUser({
              Username: "abc",
              TemporaryPassword: "Temp123!",
              UserAttributes: [
                { Name: "email", Value: "abc@example.com" },
                { Name: "email_verified", Value: "true" },
              ],
              MessageAction: "SUPPRESS",
              UserPoolId: userPoolId,
            })
            .promise();

          await client
            .adminSetUserPassword({
              UserPoolId: userPoolId,
              Username: "abc",
              Password: "Password1!",
              Permanent: true,
            })
            .promise();

          const response = await client
            .adminInitiateAuth({
              UserPoolId: userPoolId,
              ClientId: clientId,
              AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
              AuthParameters: {
                USERNAME: "abc",
                PASSWORD: "Password1!",
              },
            })
            .promise();

          const accessToken = jwt.decode(
            response.AuthenticationResult?.AccessToken!,
          ) as Record<string, unknown>;
          const idToken = jwt.decode(
            response.AuthenticationResult?.IdToken!,
          ) as Record<string, unknown>;

          expect(idToken).toMatchObject({ "custom:source": "v1" });
          expect(accessToken).not.toMatchObject({ "custom:source": "v1" });
        });
      },
      {
        lambda: makeV1Lambda({
          claimsOverrideDetails: {
            claimsToAddOrOverride: {
              "custom:source": "v1",
            },
          },
        }).lambda,
      },
    ),
  );
});
