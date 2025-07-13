import { ClockFake } from "../../src/__tests__/clockFake";
import { UserNotFoundError } from "../../src/errors";
import { withCognitoSdk } from "./setup";

const currentDate = new Date();
const roundedDate = new Date(currentDate.getTime());
roundedDate.setMilliseconds(0);

const clock = new ClockFake(currentDate);

describe(
  "CognitoIdentityServiceProvider.adminDeleteUser",
  withCognitoSdk(
    (Cognito) => {
      it("deletes a user", async () => {
        const client = Cognito();

        const pool = await client
          .createUserPool({
            PoolName: "test",
          })
          .promise();
        const userPoolId = pool.UserPool?.Id!!;

        // create the user
        const createUserResult = await client
          .adminCreateUser({
            UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
            Username: "abc",
            UserPoolId: userPoolId,
          })
          .promise();

        // verify they exist
        const beforeUserResult = await client
          .adminGetUser({
            Username: "abc",
            UserPoolId: userPoolId,
          })
          .promise();

        expect(beforeUserResult).toEqual({
          Enabled: true,
          UserAttributes: createUserResult.User?.Attributes,
          UserCreateDate: createUserResult.User?.UserCreateDate,
          UserLastModifiedDate: createUserResult.User?.UserLastModifiedDate,
          Username: createUserResult.User?.Username,
          UserStatus: createUserResult.User?.UserStatus,
        });

        // delete the user
        await client
          .adminDeleteUser({
            Username: "abc",
            UserPoolId: userPoolId,
          })
          .promise();

        // verify they don't exist anymore
        await expect(
          client
            .adminGetUser({
              Username: "abc",
              UserPoolId: userPoolId,
            })
            .promise()
        ).rejects.toEqual(new UserNotFoundError("User does not exist."));
      });

      it("deletes a user with an email address as a username", async () => {
        const client = Cognito();

        const pool = await client
          .createUserPool({
            PoolName: "test",
          })
          .promise();
        const userPoolId = pool.UserPool?.Id!!;

        // create the user
        const createUserResult = await client
          .adminCreateUser({
            UserAttributes: [
              { Name: "email", Value: "example@example.com" },
              { Name: "phone_number", Value: "0400000000" },
            ],
            Username: "example@example.com",
            UserPoolId: userPoolId,
          })
          .promise();

        // verify they exist
        const beforeUserResult = await client
          .adminGetUser({
            Username: "example@example.com",
            UserPoolId: userPoolId,
          })
          .promise();

        expect(beforeUserResult).toEqual({
          Enabled: true,
          UserAttributes: createUserResult.User?.Attributes,
          UserCreateDate: createUserResult.User?.UserCreateDate,
          UserLastModifiedDate: createUserResult.User?.UserLastModifiedDate,
          Username: createUserResult.User?.Username,
          UserStatus: createUserResult.User?.UserStatus,
        });

        // delete the user
        await client
          .adminDeleteUser({
            Username: "example@example.com",
            UserPoolId: userPoolId,
          })
          .promise();

        // verify they don't exist anymore
        await expect(
          client
            .adminGetUser({
              Username: "example@example.com",
              UserPoolId: userPoolId,
            })
            .promise()
        ).rejects.toEqual(new UserNotFoundError("User does not exist."));
      });
    },
    {
      clock,
    }
  )
);
