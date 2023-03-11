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

    it("filters users", async () => {
      const client = Cognito();

      await client
        .adminCreateUser({
          UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
          Username: "abc1",
          UserPoolId: "test",
        })
        .promise();

      const createUserResult2 = await client
        .adminCreateUser({
          UserAttributes: [{ Name: "phone_number", Value: "0500000000" }],
          Username: "abc2",
          UserPoolId: "test",
        })
        .promise();

      const result = await client
        .listUsers({
          UserPoolId: "test",
          Filter: 'phone_number ^= "05"',
        })
        .promise();

      expect(result).toEqual({
        Users: [
          {
            Attributes: createUserResult2.User?.Attributes,
            Enabled: true,
            UserCreateDate: createUserResult2.User?.UserCreateDate,
            UserLastModifiedDate: createUserResult2.User?.UserLastModifiedDate,
            UserStatus: "FORCE_CHANGE_PASSWORD",
            Username: "abc2",
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
