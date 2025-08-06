import { describe, expect, it } from "vitest";
import { ClockFake } from "../../src/__tests__/clockFake";
import { withCognitoSdk } from "./setup";

const originalDate = new Date();
const roundedDate = new Date(originalDate.getTime());
roundedDate.setMilliseconds(0);

const clock = new ClockFake(originalDate);

describe(
  "CognitoIdentityServiceProvider.listGroups",
  withCognitoSdk(
    (Cognito) => {
      it("lists groups", async () => {
        const client = Cognito();

        const pool1 = await client
          .createUserPool({
            PoolName: "test 1",
          })
          .promise();
        const userPool1Id = pool1.UserPool?.Id!;
        const pool2 = await client
          .createUserPool({
            PoolName: "test 2",
          })
          .promise();
        const userPool2Id = pool2.UserPool?.Id!;

        await client
          .createGroup({
            GroupName: "abc",
            UserPoolId: userPool1Id,
          })
          .promise();
        await client
          .createGroup({
            GroupName: "def",
            UserPoolId: userPool1Id,
          })
          .promise();
        await client
          .createGroup({
            GroupName: "ghi",
            UserPoolId: userPool2Id,
          })
          .promise();

        const result1 = await client
          .listGroups({
            UserPoolId: userPool1Id,
          })
          .promise();

        expect(result1).toEqual({
          Groups: [
            {
              CreationDate: roundedDate,
              GroupName: "abc",
              LastModifiedDate: roundedDate,
              UserPoolId: userPool1Id,
            },
            {
              CreationDate: roundedDate,
              GroupName: "def",
              LastModifiedDate: roundedDate,
              UserPoolId: userPool1Id,
            },
          ],
        });

        const result2 = await client
          .listGroups({
            UserPoolId: userPool2Id,
          })
          .promise();

        expect(result2).toEqual({
          Groups: [
            {
              CreationDate: roundedDate,
              GroupName: "ghi",
              LastModifiedDate: roundedDate,
              UserPoolId: userPool2Id,
            },
          ],
        });
      });

      it("returns an empty collection when there are no groups", async () => {
        const client = Cognito();

        const pool = await client
          .createUserPool({
            PoolName: "test",
          })
          .promise();
        const userPoolId = pool.UserPool?.Id!;

        const result = await client
          .listGroups({
            UserPoolId: userPoolId,
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
    },
  ),
);
