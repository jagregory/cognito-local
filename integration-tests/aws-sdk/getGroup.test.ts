import { describe, expect, it } from "vitest";
import { ClockFake } from "../../src/__tests__/clockFake";
import { withCognitoSdk } from "./setup";

const currentDate = new Date();
const roundedDate = new Date(currentDate.getTime());
roundedDate.setMilliseconds(0);

const clock = new ClockFake(currentDate);

describe(
  "CognitoIdentityServiceProvider.getGroup",
  withCognitoSdk(
    (Cognito) => {
      it("get a group", async () => {
        const client = Cognito();

        const pool = await client
          .createUserPool({
            PoolName: "test",
          })
          .promise();
        const userPoolId = pool.UserPool?.Id!;

        await client
          .createGroup({
            Description: "Description",
            GroupName: "abc",
            Precedence: 1,
            RoleArn: "arn",
            UserPoolId: userPoolId,
          })
          .promise();

        const getGroupResponse = await client
          .getGroup({
            GroupName: "abc",
            UserPoolId: userPoolId,
          })
          .promise();

        expect(getGroupResponse.Group).toEqual({
          CreationDate: roundedDate,
          Description: "Description",
          GroupName: "abc",
          LastModifiedDate: roundedDate,
          Precedence: 1,
          RoleArn: "arn",
          UserPoolId: userPoolId,
        });
      });
    },
    {
      clock,
    },
  ),
);
