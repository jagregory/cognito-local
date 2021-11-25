import { UUID } from "../../src/__tests__/patterns";
import { attributeValue } from "../../src/services/userPoolClient";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.initiateAuth",
  withCognitoSdk((Cognito) => {
    it("throws for missing user", async () => {
      const client = Cognito();

      const upc = await client
        .createUserPoolClient({
          UserPoolId: "test",
          ClientName: "test",
        })
        .promise();

      await expect(
        client
          .initiateAuth({
            ClientId: upc.UserPoolClient?.ClientId!,
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: {
              USERNAME: "example@example.com",
              PASSWORD: "def",
            },
          })
          .promise()
      ).rejects.toMatchObject({
        message: "User not authorized",
      });
    });

    it("handles users with FORCE_CHANGE_PASSWORD status", async () => {
      const client = Cognito();

      const upc = await client
        .createUserPoolClient({
          UserPoolId: "test",
          ClientName: "test",
        })
        .promise();

      const createUserResponse = await client
        .adminCreateUser({
          TemporaryPassword: "def",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
          Username: "abc",
          UserPoolId: "test",
        })
        .promise();
      const userSub = attributeValue(
        "sub",
        createUserResponse.User?.Attributes
      );

      const response = await client
        .initiateAuth({
          ClientId: upc.UserPoolClient?.ClientId!,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: "abc",
            PASSWORD: "def",
          },
        })
        .promise();

      expect(response).toEqual({
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        ChallengeParameters: {
          USER_ID_FOR_SRP: "abc",
          requiredAttributes: "[]",
          userAttributes: `{"sub":"${userSub}","email":"example@example.com"}`,
        },
        Session: expect.stringMatching(UUID),
      });
    });
  })
);
