import { describe, expect, it } from "vitest";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.createUserPoolClient",
  withCognitoSdk((Cognito) => {
    it("can create a new app client", async () => {
      const client = Cognito();

      const pool = await client
        .createUserPool({
          PoolName: "test",
        })
        .promise();
      const userPoolId = pool.UserPool?.Id!;

      const result = await client
        .createUserPoolClient({
          ClientName: "test",
          UserPoolId: userPoolId,
        })
        .promise();

      expect(result).toEqual({
        UserPoolClient: {
          ClientId: expect.stringMatching(/^[a-z0-9]{25}$/),
          ClientName: "test",
          CreationDate: expect.any(Date),
          LastModifiedDate: expect.any(Date),
          UserPoolId: userPoolId,
          TokenValidityUnits: {
            AccessToken: "hours",
            IdToken: "minutes",
            RefreshToken: "days",
          },
        },
      });

      const createdClient = await client
        .describeUserPoolClient({
          ClientId: result.UserPoolClient?.ClientId!,
          UserPoolId: userPoolId,
        })
        .promise();

      expect(createdClient).toEqual({
        UserPoolClient: result.UserPoolClient,
      });
    });
  }),
);
