import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.deleteGroup",
  withCognitoSdk((Cognito) => {
    it("deletes a group", async () => {
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
        })
        .promise();

      const getGroupResponse = await client
        .getGroup({
          GroupName: "abc",
          UserPoolId: userPoolId,
        })
        .promise();

      expect(getGroupResponse.Group).toBeDefined();

      await client
        .deleteGroup({
          GroupName: "abc",
          UserPoolId: userPoolId,
        })
        .promise();

      await expect(
        client
          .getGroup({
            GroupName: "abc",
            UserPoolId: userPoolId,
          })
          .promise()
      ).rejects.toMatchObject({
        code: "ResourceNotFoundException",
      });
    });
  })
);
