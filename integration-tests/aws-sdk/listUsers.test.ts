import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.listUsers",
  withCognitoSdk((Cognito) => {
    it("lists users", async () => {
      const client = Cognito();

      const createUserResult = await client
        .adminCreateUser({
          Username: "abc",
          UserPoolId: "test",
          TemporaryPassword: "TemporaryPassword", // TODO: shouldn't need to supply this
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
