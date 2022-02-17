import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.deleteUserPool",
  withCognitoSdk((Cognito) => {
    it("deletes a group", async () => {
      const client = Cognito();

      // create the user pool
      const up = await client
        .createUserPool({
          PoolName: "newPool",
        })
        .promise();

      const listResponse = await client
        .listUserPools({
          MaxResults: 1,
        })
        .promise();

      expect(listResponse.UserPools).toEqual([
        expect.objectContaining({
          Id: up.UserPool?.Id,
        }),
      ]);

      await client
        .deleteUserPool({
          UserPoolId: up.UserPool?.Id!,
        })
        .promise();

      const listResponseAfter = await client
        .listUserPools({ MaxResults: 1 })
        .promise();

      expect(listResponseAfter.UserPools).toHaveLength(0);
    });
  })
);
