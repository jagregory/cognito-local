import { describe, expect, it } from "vitest";
import { UUID } from "../../src/__tests__/patterns";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.adminDeleteUserAttributes",
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
            { Name: "custom:example", Value: "1" },
          ],
          Username: "abc",
          UserPoolId: userPoolId,
          DesiredDeliveryMediums: ["EMAIL"],
        })
        .promise();

      let user = await client
        .adminGetUser({
          UserPoolId: userPoolId,
          Username: "abc",
        })
        .promise();

      expect(user.UserAttributes).toEqual([
        { Name: "custom:example", Value: "1" },
        { Name: "email", Value: "example@example.com" },
        { Name: "sub", Value: expect.stringMatching(UUID) },
      ]);

      await client
        .adminDeleteUserAttributes({
          UserPoolId: userPoolId,
          Username: "abc",
          UserAttributeNames: ["custom:example"],
        })
        .promise();

      user = await client
        .adminGetUser({
          UserPoolId: userPoolId,
          Username: "abc",
        })
        .promise();

      expect(user.UserAttributes).toEqual([
        { Name: "email", Value: "example@example.com" },
        { Name: "sub", Value: expect.stringMatching(UUID) },
      ]);
    });
  }),
);
