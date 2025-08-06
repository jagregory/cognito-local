import { describe, expect, it } from "vitest";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.adminConfirmSignUp",
  withCognitoSdk((Cognito) => {
    it("confirms a user", async () => {
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
        .signUp({
          UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
          Username: "abc",
          ClientId: upc.UserPoolClient?.ClientId!,
          Password: "def",
        })
        .promise();

      let user = await client
        .adminGetUser({
          UserPoolId: userPoolId,
          Username: "abc",
        })
        .promise();

      expect(user.UserStatus).toEqual("UNCONFIRMED");

      await client
        .adminConfirmSignUp({
          UserPoolId: userPoolId,
          Username: "abc",
        })
        .promise();

      user = await client
        .adminGetUser({
          UserPoolId: userPoolId,
          Username: "abc",
        })
        .promise();

      expect(user.UserStatus).toEqual("CONFIRMED");
    });
  }),
);
