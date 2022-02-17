import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.deleteUserPoolClient",
  withCognitoSdk((Cognito) => {
    it("deletes a user pool client", async () => {
      const client = Cognito();

      // create the user pool client
      const upc = await client
        .createUserPoolClient({
          UserPoolId: "test",
          ClientName: "test",
        })
        .promise();

      const describeResponse = await client
        .describeUserPoolClient({
          ClientId: upc.UserPoolClient?.ClientId!,
          UserPoolId: "test",
        })
        .promise();

      expect(describeResponse.UserPoolClient).toBeDefined();

      await client
        .deleteUserPoolClient({
          ClientId: upc.UserPoolClient?.ClientId!,
          UserPoolId: "test",
        })
        .promise();

      await expect(
        client
          .describeUserPoolClient({
            ClientId: upc.UserPoolClient?.ClientId!,
            UserPoolId: "test",
          })
          .promise()
      ).rejects.toMatchObject({
        code: "ResourceNotFoundException",
      });
    });
  })
);
