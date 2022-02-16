import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.listUserPoolClients",
  withCognitoSdk((Cognito) => {
    it("can list app clients", async () => {
      const client = Cognito();

      const result = await client
        .createUserPoolClient({
          ClientName: "test",
          UserPoolId: "test",
        })
        .promise();

      const clientList = await client
        .listUserPoolClients({
          UserPoolId: "test",
        })
        .promise();

      expect(clientList).toEqual({
        UserPoolClients: [
          {
            ClientId: result.UserPoolClient?.ClientId,
            ClientName: result.UserPoolClient?.ClientName,
            UserPoolId: "test",
          },
        ],
      });
    });
  })
);
