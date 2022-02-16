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

        const createGroupResponse = await client
          .createGroup({
            GroupName: "group-1",
            UserPoolId: "test",
          })
          .promise();

        await client
          .adminCreateUser({
            DesiredDeliveryMediums: ["EMAIL"],
            TemporaryPassword: "def",
            UserAttributes: [{ Name: "email", Value: "example+1@example.com" }],
            Username: "user-1",
            UserPoolId: "test",
          })
          .promise();

        await client
          .adminAddUserToGroup({
            Username: "user-1",
            GroupName: "group-1",
            UserPoolId: "test",
          })
          .promise();

        const result = await client
          .adminListGroupsForUser({
            UserPoolId: "test",
            Username: "user-1",
          })
          .promise();

        expect(result.Groups).toEqual([createGroupResponse.Group]);

        await client
          .adminRemoveUserFromGroup({
            Username: "user-1",
            GroupName: "group-1",
            UserPoolId: "test",
          })
          .promise();

        const resultAfterRemove = await client
          .adminListGroupsForUser({
            UserPoolId: "test",
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
