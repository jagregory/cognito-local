import { MockClock } from "../../src/mocks/MockClock";
import { withCognitoSdk } from "./setup";

const originalDate = new Date();
const roundedDate = new Date(originalDate.getTime());
roundedDate.setMilliseconds(0);

const clock = new MockClock(originalDate);

describe(
  "CognitoIdentityServiceProvider.listGroups",
  withCognitoSdk(
    (Cognito) => {
      it("lists groups", async () => {
        const client = Cognito();

        await client
          .createGroup({
            GroupName: "abc",
            UserPoolId: "test1",
          })
          .promise();
        await client
          .createGroup({
            GroupName: "def",
            UserPoolId: "test1",
          })
          .promise();
        await client
          .createGroup({
            GroupName: "ghi",
            UserPoolId: "test2",
          })
          .promise();

        const result1 = await client
          .listGroups({
            UserPoolId: "test1",
          })
          .promise();

        expect(result1).toEqual({
          Groups: [
            {
              CreationDate: roundedDate,
              GroupName: "abc",
              LastModifiedDate: roundedDate,
              UserPoolId: "test1",
            },
            {
              CreationDate: roundedDate,
              GroupName: "def",
              LastModifiedDate: roundedDate,
              UserPoolId: "test1",
            },
          ],
        });

        const result2 = await client
          .listGroups({
            UserPoolId: "test2",
          })
          .promise();

        expect(result2).toEqual({
          Groups: [
            {
              CreationDate: roundedDate,
              GroupName: "ghi",
              LastModifiedDate: roundedDate,
              UserPoolId: "test2",
            },
          ],
        });
      });

      it("returns an empty collection when there are no groups", async () => {
        const client = Cognito();

        const result = await client
          .listGroups({
            UserPoolId: "test1",
          })
          .promise();

        expect(result).toEqual({
          Groups: [],
        });
      });

      // TODO: getUserPool lazily creates a pool right now, so we can't handle invalid user pools
      it.todo("handles invalid user pool");
    },
    {
      clock,
    }
  )
);
