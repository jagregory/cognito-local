import { ClockFake } from "../../src/__tests__/clockFake";
import { withCognitoSdk } from "./setup";

const currentDate = new Date();
const roundedDate = new Date(currentDate.getTime());
roundedDate.setMilliseconds(0);

const clock = new ClockFake(currentDate);

describe(
  "CognitoIdentityServiceProvider.adminSetUserPassword",
  withCognitoSdk(
    (Cognito) => {
      it("sets a permanent password", async () => {
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

        await client
          .adminSetUserPassword({
            Username: "abc",
            UserPoolId: userPoolId,
            Password: "newPassword",
            Permanent: true,
          })
          .promise();

        // verify they exist
        const result = await client
          .adminGetUser({
            Username: "abc",
            UserPoolId: userPoolId,
          })
          .promise();

        expect(result).toEqual({
          Enabled: true,
          UserAttributes: createUserResult.User?.Attributes,
          UserCreateDate: createUserResult.User?.UserCreateDate,
          UserLastModifiedDate: createUserResult.User?.UserLastModifiedDate,
          Username: createUserResult.User?.Username,
          UserStatus: "CONFIRMED",
        });
      });
    },
    {
      clock,
    }
  )
);
