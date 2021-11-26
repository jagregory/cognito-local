import { ClockFake } from "../../src/__tests__/clockFake";
import { UUID } from "../../src/__tests__/patterns";
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

        // create the user
        const createUserResult = await client
          .adminCreateUser({
            UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
            Username: "abc",
            UserPoolId: "test",
          })
          .promise();

        // verify they exist
        const beforeUserResult = await client
          .adminGetUser({
            Username: "abc",
            UserPoolId: "test",
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
            UserPoolId: "test",
          })
          .promise();

        // verify they don't exist anymore
        await expect(
          client
            .adminGetUser({
              Username: "abc",
              UserPoolId: "test",
            })
            .promise()
        ).rejects.toEqual(new UserNotFoundError("User does not exist"));
      });
    },
    {
      clock,
    }
  )
);
