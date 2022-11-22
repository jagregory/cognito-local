import { ClockFake } from "../../src/__tests__/clockFake";
import { withCognitoSdk } from "./setup";
import { attributeValue } from "../../src/services/userPoolService";

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
          Username: attributeValue("sub", createUserResult.User?.Attributes),
          UserStatus: "CONFIRMED",
        });
      });
    },
    {
      clock,
    }
  )
);
