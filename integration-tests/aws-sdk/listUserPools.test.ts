import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.listUserPools",
  withCognitoSdk((Cognito) => {
    it("lists user pools", async () => {
      const client = Cognito();

      // TODO: refactor this when we support createUserPool
      // right now we're relying on pools being created on-demand when a user is created
      await client
        .adminCreateUser({
          Username: "abc",
          UserPoolId: "test-1",
          TemporaryPassword: "TemporaryPassword", // TODO: shouldn't need to supply this
        })
        .promise();
      await client
        .adminCreateUser({
          Username: "abc",
          UserPoolId: "test-2",
          TemporaryPassword: "TemporaryPassword", // TODO: shouldn't need to supply this
        })
        .promise();
      await client
        .adminCreateUser({
          Username: "abc",
          UserPoolId: "test-3",
          TemporaryPassword: "TemporaryPassword", // TODO: shouldn't need to supply this
        })
        .promise();

      const result = await client
        .listUserPools({
          MaxResults: 10,
        })
        .promise();

      expect(result).toEqual({
        UserPools: [{ Id: "test-1" }, { Id: "test-2" }, { Id: "test-3" }],
      });
    });
  })
);
