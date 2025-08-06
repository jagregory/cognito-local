import { describe, expect, it } from "vitest";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.updateUserPoolClient",
  withCognitoSdk((Cognito) => {
    it("updates a user pool client", async () => {
      const client = Cognito();

      const pool = await client
        .createUserPool({
          PoolName: "test",
        })
        .promise();
      const userPoolId = pool.UserPool?.Id!;

      // create the user pool client
      const upc = await client
        .createUserPoolClient({
          UserPoolId: userPoolId,
          ClientName: "test",
        })
        .promise();

      const describeResponse = await client
        .describeUserPoolClient({
          ClientId: upc.UserPoolClient?.ClientId!,
          UserPoolId: userPoolId,
        })
        .promise();

      expect(describeResponse.UserPoolClient).toMatchObject({
        ClientName: "test",
      });

      await client
        .updateUserPoolClient({
          ClientId: upc.UserPoolClient?.ClientId!,
          UserPoolId: userPoolId,
          ClientName: "new client name",
        })
        .promise();

      const describeResponseAfterUpdate = await client
        .describeUserPoolClient({
          ClientId: upc.UserPoolClient?.ClientId!,
          UserPoolId: userPoolId,
        })
        .promise();

      expect(describeResponseAfterUpdate.UserPoolClient).toMatchObject({
        ClientName: "new client name",
      });
    });
  }),
);
