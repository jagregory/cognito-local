import { withCognitoSdk } from "./setup";
import { UUID } from "../../src/__tests__/patterns";

describe(
  "CognitoIdentityServiceProvider.listUsers",
  withCognitoSdk((Cognito) => {
    describe("without any username attributes configured on the user pool", () => {
      it("lists users", async () => {
        const client = Cognito();

        const pool = await client
          .createUserPool({
            PoolName: "test",
          })
          .promise();
        const userPoolId = pool.UserPool?.Id!!;

        const createUserResult = await client
          .adminCreateUser({
            UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
            Username: "abc",
            UserPoolId: userPoolId,
          })
          .promise();

        const result = await client
          .listUsers({
            UserPoolId: userPoolId,
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

        const pool = await client
          .createUserPool({
            PoolName: "test",
          })
          .promise();
        const userPoolId = pool.UserPool?.Id!!;

        await client
          .adminCreateUser({
            UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
            Username: "abc1",
            UserPoolId: userPoolId,
          })
          .promise();

        const createUserResult2 = await client
          .adminCreateUser({
            UserAttributes: [{ Name: "phone_number", Value: "0500000000" }],
            Username: "abc2",
            UserPoolId: userPoolId,
          })
          .promise();

        const result = await client
          .listUsers({
            UserPoolId: userPoolId,
            Filter: 'phone_number ^= "05"',
          })
          .promise();

        expect(result).toEqual({
          Users: [
            {
              Attributes: createUserResult2.User?.Attributes,
              Enabled: true,
              UserCreateDate: createUserResult2.User?.UserCreateDate,
              UserLastModifiedDate:
                createUserResult2.User?.UserLastModifiedDate,
              UserStatus: "FORCE_CHANGE_PASSWORD",
              Username: "abc2",
            },
          ],
        });
      });

      it("handles no users", async () => {
        const client = Cognito();

        const pool = await client
          .createUserPool({
            PoolName: "test",
          })
          .promise();
        const userPoolId = pool.UserPool?.Id!!;

        const result = await client
          .listUsers({
            UserPoolId: userPoolId,
          })
          .promise();

        expect(result).toEqual({
          Users: [],
        });
      });
    });

    describe("with email configured as a username attribute on the user pool", () => {
      it("lists users", async () => {
        const client = Cognito();

        const pool = await client
          .createUserPool({
            PoolName: "test",
            UsernameAttributes: ["email"],
          })
          .promise();
        const userPoolId = pool.UserPool?.Id!!;

        const createUserResult = await client
          .adminCreateUser({
            UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
            Username: "example@example.com",
            UserPoolId: userPoolId,
          })
          .promise();

        const result = await client
          .listUsers({
            UserPoolId: userPoolId,
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
              Username: expect.stringMatching(UUID),
            },
          ],
        });
      });
    });
  })
);
