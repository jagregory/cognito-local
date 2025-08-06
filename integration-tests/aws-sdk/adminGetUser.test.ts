import { describe, expect, it } from "vitest";
import { ClockFake } from "../../src/__tests__/clockFake";
import { UUID } from "../../src/__tests__/patterns";
import { attributeValue } from "../../src/services/userPoolService";
import { withCognitoSdk } from "./setup";

const currentDate = new Date();
const roundedDate = new Date(currentDate.getTime());
roundedDate.setMilliseconds(0);

const clock = new ClockFake(currentDate);

describe(
  "CognitoIdentityServiceProvider.adminGetUser",
  withCognitoSdk(
    (Cognito) => {
      describe("without any username attributes configured on the user pool", () => {
        it("gets a user", async () => {
          const client = Cognito();

          const pool = await client
            .createUserPool({
              PoolName: "test",
            })
            .promise();
          const userPoolId = pool.UserPool?.Id!;

          // create the user
          const createUserResult = await client
            .adminCreateUser({
              UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
              Username: "abc",
              UserPoolId: userPoolId,
            })
            .promise();

          expect(createUserResult.User?.Username).toEqual("abc");
          expect(
            attributeValue("sub", createUserResult.User?.Attributes),
          ).toEqual(expect.stringMatching(UUID));

          // verify they exist
          const result = await client
            .adminGetUser({
              Username: "abc",
              UserPoolId: userPoolId,
            })
            .promise();

          expect(result).toEqual({
            Enabled: true,
            UserAttributes: createUserResult.User?.Attributes,
            UserCreateDate: createUserResult.User?.UserCreateDate,
            UserLastModifiedDate: createUserResult.User?.UserLastModifiedDate,
            Username: createUserResult.User?.Username,
            UserStatus: createUserResult.User?.UserStatus,
          });
        });
      });

      describe("with email configured as a username attribute on the user pool", () => {
        it("gets a user", async () => {
          const client = Cognito();

          const pool = await client
            .createUserPool({
              PoolName: "test",
              UsernameAttributes: ["email"],
            })
            .promise();
          const userPoolId = pool.UserPool?.Id!;

          // create the user
          const createUserResult = await client
            .adminCreateUser({
              UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
              Username: "example@example.com",
              UserPoolId: userPoolId,
            })
            .promise();

          expect(createUserResult.User?.Username).toEqual(
            expect.stringMatching(UUID),
          );
          expect(
            attributeValue("sub", createUserResult.User?.Attributes),
          ).toEqual(expect.stringMatching(UUID));

          // verify they exist by email
          let result = await client
            .adminGetUser({
              Username: "example@example.com",
              UserPoolId: userPoolId,
            })
            .promise();

          expect(result).toEqual({
            Enabled: true,
            UserAttributes: createUserResult.User?.Attributes,
            UserCreateDate: createUserResult.User?.UserCreateDate,
            UserLastModifiedDate: createUserResult.User?.UserLastModifiedDate,
            Username: createUserResult.User?.Username,
            UserStatus: createUserResult.User?.UserStatus,
          });

          // verify they exist by sub
          result = await client
            .adminGetUser({
              Username: attributeValue(
                "sub",
                createUserResult.User?.Attributes,
              )!,
              UserPoolId: userPoolId,
            })
            .promise();

          expect(result).toEqual({
            Enabled: true,
            UserAttributes: createUserResult.User?.Attributes,
            UserCreateDate: createUserResult.User?.UserCreateDate,
            UserLastModifiedDate: createUserResult.User?.UserLastModifiedDate,
            Username: createUserResult.User?.Username,
            UserStatus: createUserResult.User?.UserStatus,
          });
        });
      });
    },
    {
      clock,
    },
  ),
);
