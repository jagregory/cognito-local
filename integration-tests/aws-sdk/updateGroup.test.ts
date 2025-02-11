import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.updateGroup",
  withCognitoSdk((Cognito) => {
    it("updates a group", async () => {
      const client = Cognito();

      const pool = await client
        .createUserPool({
          PoolName: "test",
        })
        .promise();
      const userPoolId = pool.UserPool?.Id!!;

      await client
        .createGroup({
          GroupName: "abc",
          UserPoolId: userPoolId,
          Description: "original description",
        })
        .promise();

      const getGroupResponse = await client
        .getGroup({
          GroupName: "abc",
          UserPoolId: userPoolId,
        })
        .promise();

      expect(getGroupResponse.Group).toMatchObject({
        GroupName: "abc",
        Description: "original description",
      });

      await client
        .updateGroup({
          GroupName: "abc",
          UserPoolId: userPoolId,
          Description: "new description",
        })
        .promise();

      const getGroupResponseAfterUpdate = await client
        .getGroup({
          GroupName: "abc",
          UserPoolId: userPoolId,
        })
        .promise();

      expect(getGroupResponseAfterUpdate.Group).toMatchObject({
        GroupName: "abc",
        Description: "new description",
      });
    });
  })
);
