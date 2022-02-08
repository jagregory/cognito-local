import { UUID } from "../../src/models";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.adminDeleteUserAttributes",
  withCognitoSdk((Cognito) => {
    it("updates a user's attributes", async () => {
      const client = Cognito();

      await client
        .adminCreateUser({
          UserAttributes: [
            { Name: "email", Value: "example@example.com" },
            { Name: "custom:example", Value: "1" },
          ],
          Username: "abc",
          UserPoolId: "test",
          DesiredDeliveryMediums: ["EMAIL"],
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
        { Name: "custom:example", Value: "1" },
      ]);

      await client
        .adminDeleteUserAttributes({
          UserPoolId: "test",
          Username: "abc",
          UserAttributeNames: ["custom:example"],
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
        { Name: "email", Value: "example@example.com" },
      ]);
    });
  })
);
