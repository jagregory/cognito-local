import { describe, expect, it } from "vitest";
import { UUID } from "../../src/__tests__/patterns";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.adminUpdateUserAttributes",
  withCognitoSdk((Cognito) => {
    it("updates a user's attributes", async () => {
      const client = Cognito();

      const pool = await client
        .createUserPool({
          PoolName: "test",
        })
        .promise();
      const userPoolId = pool.UserPool?.Id!;

      await client
        .adminCreateUser({
          UserAttributes: [
            { Name: "email", Value: "example@example.com" },
            { Name: "phone_number", Value: "0400000000" },
          ],
          Username: "abc",
          UserPoolId: userPoolId,
        })
        .promise();

      let user = await client
        .adminGetUser({
          UserPoolId: userPoolId,
          Username: "abc",
        })
        .promise();

      expect(user.UserAttributes).toEqual([
        { Name: "email", Value: "example@example.com" },
        { Name: "phone_number", Value: "0400000000" },
        { Name: "sub", Value: expect.stringMatching(UUID) },
      ]);

      await client
        .adminUpdateUserAttributes({
          UserPoolId: userPoolId,
          Username: "abc",
          UserAttributes: [{ Name: "email", Value: "example2@example.com" }],
        })
        .promise();

      user = await client
        .adminGetUser({
          UserPoolId: userPoolId,
          Username: "abc",
        })
        .promise();

      expect(user.UserAttributes).toEqual([
        { Name: "email", Value: "example2@example.com" },
        { Name: "email_verified", Value: "false" },
        { Name: "phone_number", Value: "0400000000" },
        { Name: "sub", Value: expect.stringMatching(UUID) },
      ]);
    });
  }),
);
