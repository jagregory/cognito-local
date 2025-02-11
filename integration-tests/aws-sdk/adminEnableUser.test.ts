import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.adminEnableUser",
  withCognitoSdk((Cognito) => {
    it("updates a user's attributes", async () => {
      const client = Cognito();

      const pool = await client
        .createUserPool({
          PoolName: "test",
        })
        .promise();
      const userPoolId = pool.UserPool?.Id!!;

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

      await client
        .adminDisableUser({
          UserPoolId: userPoolId,
          Username: "abc",
        })
        .promise();

      let user = await client
        .adminGetUser({
          UserPoolId: userPoolId,
          Username: "abc",
        })
        .promise();

      expect(user.Enabled).toEqual(false);

      await client
        .adminEnableUser({
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

      expect(user.Enabled).toEqual(true);
    });
  })
);
