import { describe, expect, it } from "vitest";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.listUserPoolClients",
  withCognitoSdk((Cognito) => {
    it("can list app clients", async () => {
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

      const clientList = await client
        .listUserPoolClients({
          UserPoolId: userPoolId,
        })
        .promise();

      expect(clientList).toEqual({
        UserPoolClients: [
          {
            ClientId: result.UserPoolClient?.ClientId,
            ClientName: result.UserPoolClient?.ClientName,
            UserPoolId: userPoolId,
          },
        ],
      });
    });
  }),
);
