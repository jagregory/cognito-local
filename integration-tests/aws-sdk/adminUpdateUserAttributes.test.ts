import { UUID } from "../../src/mocks";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.adminUpdateUserAttributes",
  withCognitoSdk((Cognito) => {
    it("updates a user's attributes", async () => {
      const client = Cognito();

      await client
        .adminCreateUser({
          UserAttributes: [
            { Name: "email", Value: "example@example.com" },
            { Name: "phone_number", Value: "0400000000" },
          ],
          Username: "abc",
          UserPoolId: "test",
        })
        .promise();

      let user = await client
        .adminGetUser({
          UserPoolId: "test",
          Username: "abc",
        })
        .promise();

      expect(user.UserAttributes).toEqual([
        { Name: "sub", Value: expect.stringMatching(UUID) },
        { Name: "email", Value: "example@example.com" },
        { Name: "phone_number", Value: "0400000000" },
      ]);

      await client
        .adminUpdateUserAttributes({
          UserPoolId: "test",
          Username: "abc",
          UserAttributes: [{ Name: "email", Value: "example2@example.com" }],
        })
        .promise();

      user = await client
        .adminGetUser({
          UserPoolId: "test",
          Username: "abc",
        })
        .promise();

      expect(user.UserAttributes).toEqual([
        { Name: "sub", Value: expect.stringMatching(UUID) },
        { Name: "email", Value: "example2@example.com" },
        { Name: "phone_number", Value: "0400000000" },
        { Name: "email_verified", Value: "false" },
      ]);
    });
  })
);
