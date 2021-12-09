import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.adminConfirmSignUp",
  withCognitoSdk((Cognito) => {
    it("creates a user with only the required parameters", async () => {
      const client = Cognito();

      await client
        .adminCreateUser({
          UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
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

      expect(user.UserStatus).toEqual("FORCE_CHANGE_PASSWORD");

      await client
        .adminConfirmSignUp({
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

      expect(user.UserStatus).toEqual("CONFIRMED");
    });
  })
);
