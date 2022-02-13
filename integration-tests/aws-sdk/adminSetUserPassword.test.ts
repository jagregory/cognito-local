import { DateClock } from "../../src/services/clock";
import { withCognitoSdk } from "./setup";

const currentDate = new Date();
const roundedDate = new Date(currentDate.getTime());
roundedDate.setMilliseconds(0);

const clock = new DateClock(currentDate);

describe(
  "CognitoIdentityServiceProvider.adminSetUserPassword",
  withCognitoSdk(
    (Cognito) => {
      it("sets a permanent password", async () => {
        const client = Cognito();

        // create the user
        const createUserResult = await client
          .adminCreateUser({
            UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
            Username: "abc",
            UserPoolId: "test",
          })
          .promise();

        await client
          .adminSetUserPassword({
            Username: "abc",
            UserPoolId: "test",
            Password: "newPassword",
            Permanent: true,
          })
          .promise();

        // verify they exist
        const result = await client
          .adminGetUser({
            Username: "abc",
            UserPoolId: "test",
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
