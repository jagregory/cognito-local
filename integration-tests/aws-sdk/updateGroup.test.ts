import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.updateGroup",
  withCognitoSdk((Cognito) => {
    it("updates a group", async () => {
      const client = Cognito();

      await client
        .createGroup({
          GroupName: "abc",
          UserPoolId: "test",
          Description: "original description",
        })
        .promise();

      const getGroupResponse = await client
        .getGroup({
          GroupName: "abc",
          UserPoolId: "test",
        })
        .promise();

      expect(getGroupResponse.Group).toMatchObject({
        GroupName: "abc",
        Description: "original description",
      });

      await client
        .updateGroup({
          GroupName: "abc",
          UserPoolId: "test",
          Description: "new description",
        })
        .promise();

      const getGroupResponseAfterUpdate = await client
        .getGroup({
          GroupName: "abc",
          UserPoolId: "test",
        })
        .promise();

      expect(getGroupResponseAfterUpdate.Group).toMatchObject({
        GroupName: "abc",
        Description: "new description",
      });
    });
  })
);
