import { describe, expect, it } from "vitest";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.listUserPools",
  withCognitoSdk((Cognito) => {
    it("lists user pools", async () => {
      const client = Cognito();

      await client
        .createUserPool({
          PoolName: "test-1",
        })
        .promise();
      await client
        .createUserPool({
          PoolName: "test-2",
        })
        .promise();
      await client
        .createUserPool({
          PoolName: "test-3",
        })
        .promise();

      const result = await client
        .listUserPools({
          MaxResults: 10,
        })
        .promise();

      expect(result.UserPools).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ Name: "test-1" }),
          expect.objectContaining({ Name: "test-2" }),
          expect.objectContaining({ Name: "test-3" }),
        ]),
      );
    });
  }),
);
