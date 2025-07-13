import { ClockFake } from "../../src/__tests__/clockFake";
import { withCognitoSdk } from "./setup";

const originalDate = new Date();
const roundedDate = new Date(originalDate.getTime());
roundedDate.setMilliseconds(0);

const clock = new ClockFake(originalDate);

describe(
  "CognitoIdentityServiceProvider.adminRemoveUserFromGroup",
  withCognitoSdk(
    (Cognito) => {
      it("lists groups for a user", async () => {
        const client = Cognito();

        const pool = await client
          .createUserPool({
            PoolName: "test",
          })
          .promise();
        const userPoolId = pool.UserPool?.Id!!;

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

        await client
          .adminRemoveUserFromGroup({
            Username: "user-1",
            GroupName: "group-1",
            UserPoolId: userPoolId,
          })
          .promise();

        const resultAfterRemove = await client
          .adminListGroupsForUser({
            UserPoolId: userPoolId,
            Username: "user-1",
          })
          .promise();

        expect(resultAfterRemove.Groups).toHaveLength(0);
      });
    },
    {
      clock,
    }
  )
);
