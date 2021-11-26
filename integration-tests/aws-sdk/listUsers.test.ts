import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.listUsers",
  withCognitoSdk((Cognito) => {
    it("lists users", async () => {
      const client = Cognito();

      const createUserResult = await client
        .adminCreateUser({
          UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
          Username: "abc",
          UserPoolId: "test",

          // TODO: shouldn't need to supply this
          TemporaryPassword: "TemporaryPassword",
        })
        .promise();

      const result = await client
        .listUsers({
          UserPoolId: "test",
        })
        .promise();

      expect(result).toEqual({
        Users: [
          {
            Attributes: createUserResult.User?.Attributes,
            Enabled: true,
            UserCreateDate: createUserResult.User?.UserCreateDate,
            UserLastModifiedDate: createUserResult.User?.UserLastModifiedDate,
            UserStatus: "FORCE_CHANGE_PASSWORD",
            Username: "abc",
          },
        ],
      });
    });

    it("handles no users", async () => {
      const client = Cognito();

      const result = await client
        .listUsers({
          UserPoolId: "test",
        })
        .promise();

      expect(result).toEqual({
        Users: [],
      });
    });
  })
);
