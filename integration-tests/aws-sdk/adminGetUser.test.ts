import { ClockFake } from "../../src/__tests__/clockFake";
import { withCognitoSdk } from "./setup";

const currentDate = new Date();
const roundedDate = new Date(currentDate.getTime());
roundedDate.setMilliseconds(0);

const clock = new ClockFake(currentDate);

describe(
  "CognitoIdentityServiceProvider.adminGetUser",
  withCognitoSdk(
    (Cognito) => {
      it("gets a user", async () => {
        const client = Cognito();

        // create the user
        const createUserResult = await client
          .adminCreateUser({
            Username: "abc",
            UserPoolId: "test",

            // TODO: shouldn't need to supply this
            TemporaryPassword: "TemporaryPassword",
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
          UserStatus: createUserResult.User?.UserStatus,
        });
      });
    },
    {
      clock,
    }
  )
);
