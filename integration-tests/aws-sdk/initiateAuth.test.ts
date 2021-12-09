import jwt from "jsonwebtoken";
import { UUID } from "../../src/__tests__/patterns";
import { attributeValue } from "../../src/services/userPoolService";
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
          DesiredDeliveryMediums: ["EMAIL"],
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

    it("can authenticate users with USER_PASSWORD_AUTH auth flow", async () => {
      const client = Cognito();

      const upc = await client
        .createUserPoolClient({
          UserPoolId: "test",
          ClientName: "test",
        })
        .promise();

      const createUserResponse = await client
        .adminCreateUser({
          DesiredDeliveryMediums: ["EMAIL"],
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

      await client
        .adminConfirmSignUp({
          UserPoolId: "test",
          Username: "abc",
        })
        .promise();

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

      expect(
        jwt.decode(response.AuthenticationResult?.AccessToken as string)
      ).toEqual({
        auth_time: expect.any(Number),
        client_id: upc.UserPoolClient?.ClientId,
        event_id: expect.stringMatching(UUID),
        exp: expect.any(Number),
        iat: expect.any(Number),
        iss: "http://localhost:9229/test",
        jti: expect.stringMatching(UUID),
        scope: "aws.cognito.signin.user.admin",
        sub: userSub,
        token_use: "access",
        username: "abc",
      });

      expect(
        jwt.decode(response.AuthenticationResult?.IdToken as string)
      ).toEqual({
        "cognito:username": "abc",
        aud: upc.UserPoolClient?.ClientId,
        auth_time: expect.any(Number),
        email: "example@example.com",
        email_verified: false,
        event_id: expect.stringMatching(UUID),
        exp: expect.any(Number),
        iat: expect.any(Number),
        iss: "http://localhost:9229/test",
        jti: expect.stringMatching(UUID),
        sub: userSub,
        token_use: "id",
      });

      expect(
        jwt.decode(response.AuthenticationResult?.RefreshToken as string)
      ).toEqual({
        "cognito:username": "abc",
        email: "example@example.com",
        exp: expect.any(Number),
        iat: expect.any(Number),
        iss: "http://localhost:9229/test",
        jti: expect.stringMatching(UUID),
      });
    });

    it("can authenticate users with REFRESH_TOKEN_AUTH auth flow", async () => {
      const client = Cognito();

      const upc = await client
        .createUserPoolClient({
          UserPoolId: "test",
          ClientName: "test",
        })
        .promise();

      const createUserResponse = await client
        .adminCreateUser({
          DesiredDeliveryMediums: ["EMAIL"],
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

      await client
        .adminConfirmSignUp({
          UserPoolId: "test",
          Username: "abc",
        })
        .promise();

      const initialLoginResponse = await client
        .initiateAuth({
          ClientId: upc.UserPoolClient?.ClientId!,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: "abc",
            PASSWORD: "def",
          },
        })
        .promise();

      const refreshTokenLoginResponse = await client
        .initiateAuth({
          ClientId: upc.UserPoolClient?.ClientId!,
          AuthFlow: "REFRESH_TOKEN_AUTH",
          AuthParameters: {
            REFRESH_TOKEN: initialLoginResponse.AuthenticationResult
              ?.RefreshToken as string,
          },
        })
        .promise();

      expect(
        jwt.decode(
          refreshTokenLoginResponse.AuthenticationResult?.AccessToken as string
        )
      ).toEqual({
        auth_time: expect.any(Number),
        client_id: upc.UserPoolClient?.ClientId,
        event_id: expect.stringMatching(UUID),
        exp: expect.any(Number),
        iat: expect.any(Number),
        iss: "http://localhost:9229/test",
        jti: expect.stringMatching(UUID),
        scope: "aws.cognito.signin.user.admin",
        sub: userSub,
        token_use: "access",
        username: "abc",
      });

      expect(
        jwt.decode(
          refreshTokenLoginResponse.AuthenticationResult?.IdToken as string
        )
      ).toEqual({
        "cognito:username": "abc",
        aud: upc.UserPoolClient?.ClientId,
        auth_time: expect.any(Number),
        email: "example@example.com",
        email_verified: false,
        event_id: expect.stringMatching(UUID),
        exp: expect.any(Number),
        iat: expect.any(Number),
        iss: "http://localhost:9229/test",
        jti: expect.stringMatching(UUID),
        sub: userSub,
        token_use: "id",
      });

      expect(
        refreshTokenLoginResponse.AuthenticationResult?.RefreshToken
      ).not.toBeDefined();
    });
  })
);
