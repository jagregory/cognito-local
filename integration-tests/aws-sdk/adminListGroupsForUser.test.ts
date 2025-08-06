import { describe, expect, it } from "vitest";
import { ClockFake } from "../../src/__tests__/clockFake";
import { withCognitoSdk } from "./setup";

const originalDate = new Date();
const roundedDate = new Date(originalDate.getTime());
roundedDate.setMilliseconds(0);

const clock = new ClockFake(originalDate);

describe(
  "CognitoIdentityServiceProvider.adminListGroupsForUser",
  withCognitoSdk(
    (Cognito) => {
      it("lists groups for a user", async () => {
        const client = Cognito();

        const pool = await client
          .createUserPool({
            PoolName: "test",
          })
          .promise();
        const userPoolId = pool.UserPool?.Id!;

        const createGroupResponse = await client
          .createGroup({
            GroupName: "group-1",
            UserPoolId: userPoolId,
          })
          .promise();

        await client
          .adminCreateUser({
            DesiredDeliveryMediums: ["EMAIL"],
            TemporaryPassword: "def",
            UserAttributes: [{ Name: "email", Value: "example+1@example.com" }],
            Username: "user-1",
            UserPoolId: userPoolId,
          })
          .promise();

        await client
          .adminAddUserToGroup({
            Username: "user-1",
            GroupName: "group-1",
            UserPoolId: userPoolId,
          })
          .promise();

        const result = await client
          .adminListGroupsForUser({
            UserPoolId: userPoolId,
            Username: "user-1",
          })
          .promise();

        expect(result.Groups).toEqual([createGroupResponse.Group]);
      });

      it("lists groups for an unassigned user", async () => {
        const client = Cognito();

        const pool = await client
          .createUserPool({
            PoolName: "test",
          })
          .promise();
        const userPoolId = pool.UserPool?.Id!;

        await client
          .createGroup({
            GroupName: "group-2",
            UserPoolId: userPoolId,
          })
          .promise();

        await client
          .adminCreateUser({
            DesiredDeliveryMediums: ["EMAIL"],
            TemporaryPassword: "def",
            UserAttributes: [{ Name: "email", Value: "example+1@example.com" }],
            Username: "user-1",
            UserPoolId: userPoolId,
          })
          .promise();

        const result = await client
          .adminListGroupsForUser({
            UserPoolId: userPoolId,
            Username: "user-1",
          })
          .promise();

        expect(result.Groups).toHaveLength(0);
      });
    },
    {
      clock,
    },
  ),
);
