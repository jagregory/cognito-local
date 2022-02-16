import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.deleteGroup",
  withCognitoSdk((Cognito) => {
    it("deletes a group", async () => {
      const client = Cognito();

      await client
        .createGroup({
          GroupName: "abc",
          UserPoolId: "test",
        })
        .promise();

      const getGroupResponse = await client
        .getGroup({
          GroupName: "abc",
          UserPoolId: "test",
        })
        .promise();

      expect(getGroupResponse.Group).toBeDefined();

      await client
        .deleteGroup({
          GroupName: "abc",
          UserPoolId: "test",
        })
        .promise();

      await expect(
        client
          .getGroup({
            GroupName: "abc",
            UserPoolId: "test",
          })
          .promise()
      ).rejects.toMatchObject({
        code: "ResourceNotFoundException",
      });
    });
  })
);
