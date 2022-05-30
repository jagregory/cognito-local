import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.adminEnableUser",
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

      await client
        .adminDisableUser({
          UserPoolId: "test",
          Username: "abc",
        })
        .promise();

      let user = await client
        .adminGetUser({
          UserPoolId: "test",
          Username: "abc",
        })
        .promise();

      expect(user.Enabled).toEqual(false);

      await client
        .adminEnableUser({
          UserPoolId: "test",
          Username: "abc",
        })
        .promise();

      user = await client
        .adminGetUser({
          UserPoolId: "test",
          Username: "abc",
        })
        .promise();

      expect(user.Enabled).toEqual(true);
    });
  })
);
