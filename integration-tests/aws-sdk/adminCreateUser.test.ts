import { DateClock } from "../../src/services/clock";
import { UUID } from "../../src/mocks";
import { withCognitoSdk } from "./setup";

const currentDate = new Date();
const roundedDate = new Date(currentDate.getTime());
roundedDate.setMilliseconds(0);

const clock = new DateClock(currentDate);

describe(
  "CognitoIdentityServiceProvider.adminCreateUser",
  withCognitoSdk(
    (Cognito) => {
      it("creates a user with only the required parameters", async () => {
        const client = Cognito();

        const createUserResult = await client
          .adminCreateUser({
            UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
            Username: "abc",
            UserPoolId: "test",
          })
          .promise();

        expect(createUserResult).toEqual({
          User: {
            Attributes: [
              {
                Name: "sub",
                Value: expect.stringMatching(UUID),
              },
              { Name: "phone_number", Value: "0400000000" },
            ],
            Enabled: true,
            UserCreateDate: roundedDate,
            UserLastModifiedDate: roundedDate,
            UserStatus: "FORCE_CHANGE_PASSWORD",
            Username: "abc",
          },
        });
      });
    },
    {
      clock,
    }
  )
);
