import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { UUID } from "../../src/__tests__/patterns";
import { attributeValue } from "../../src/services/userPoolService";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.adminInitiateAuth",
  withCognitoSdk((Cognito) => {
    it("throws for missing user", async () => {
      const client = Cognito();

      const pool = await client
        .createUserPool({
          PoolName: "test",
        })
        .promise();
      const userPoolId = pool.UserPool?.Id!;

      const upc = await client
        .createUserPoolClient({
          UserPoolId: userPoolId,
          ClientName: "test",
        })
        .promise();

      await expect(
        client
          .adminInitiateAuth({
            UserPoolId: userPoolId,
            ClientId: upc.UserPoolClient?.ClientId!,
            AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
            AuthParameters: {
              USERNAME: "example@example.com",
              PASSWORD: "def",
            },
          })
          .promise(),
      ).rejects.toMatchObject({
        message: "User not authorized",
      });
    });

    it("handles users with UNCONFIRMED status", async () => {
      const client = Cognito();

      const pool = await client
        .createUserPool({
          PoolName: "test",
        })
        .promise();
      const userPoolId = pool.UserPool?.Id!;

      const upc = await client
        .createUserPoolClient({
          UserPoolId: userPoolId,
          ClientName: "test",
        })
        .promise();

      await client
        .signUp({
          ClientId: upc.UserPoolClient?.ClientId!,
          Password: "def",
          UserAttributes: [{ Name: "email", Value: "example@example.com" }],
          Username: "abc",
        })
        .promise();

      await expect(
        client
          .adminInitiateAuth({
            UserPoolId: userPoolId,
            ClientId: upc.UserPoolClient?.ClientId!,
            AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
            AuthParameters: {
              USERNAME: "abc",
              PASSWORD: "def",
            },
          })
          .promise(),
      ).rejects.toMatchObject({
        name: "UserNotConfirmedException",
        message: "User is not confirmed.",
      });
    });

    it("can authenticate users with ADMIN_USER_PASSWORD_AUTH auth flow", async () => {
      const client = Cognito();

      const pool = await client
        .createUserPool({
          PoolName: "test",
        })
        .promise();
      const userPoolId = pool.UserPool?.Id!;

      const upc = await client
        .createUserPoolClient({
          UserPoolId: userPoolId,
          ClientName: "test",
        })
        .promise();

      const createUserResponse = await client
        .adminCreateUser({
          DesiredDeliveryMediums: ["EMAIL"],
          TemporaryPassword: "def",
          UserAttributes: [
            { Name: "email", Value: "example@example.com" },
            { Name: "email_verified", Value: "true" },
          ],
          Username: "abc",
          UserPoolId: userPoolId,
        })
        .promise();
      const userSub = attributeValue(
        "sub",
        createUserResponse.User?.Attributes,
      );

      const response = await client
        .adminInitiateAuth({
          UserPoolId: userPoolId,
          ClientId: upc.UserPoolClient?.ClientId!,
          AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: "abc",
            PASSWORD: "def",
          },
        })
        .promise();

      expect(
        jwt.decode(response.AuthenticationResult?.AccessToken as string),
      ).toEqual({
        auth_time: expect.any(Number),
        client_id: upc.UserPoolClient?.ClientId,
        event_id: expect.stringMatching(UUID),
        exp: expect.any(Number),
        iat: expect.any(Number),
        iss: `http://localhost:9229/${userPoolId}`,
        jti: expect.stringMatching(UUID),
        scope: "aws.cognito.signin.user.admin",
        sub: userSub,
        token_use: "access",
        username: "abc",
      });

      expect(
        jwt.decode(response.AuthenticationResult?.IdToken as string),
      ).toEqual({
        "cognito:username": "abc",
        aud: upc.UserPoolClient?.ClientId,
        auth_time: expect.any(Number),
        email: "example@example.com",
        email_verified: true,
        event_id: expect.stringMatching(UUID),
        exp: expect.any(Number),
        iat: expect.any(Number),
        iss: `http://localhost:9229/${userPoolId}`,
        jti: expect.stringMatching(UUID),
        sub: userSub,
        token_use: "id",
      });

      expect(
        jwt.decode(response.AuthenticationResult?.RefreshToken as string),
      ).toEqual({
        "cognito:username": "abc",
        email: "example@example.com",
        exp: expect.any(Number),
        iat: expect.any(Number),
        iss: `http://localhost:9229/${userPoolId}`,
        jti: expect.stringMatching(UUID),
      });
    });

    it("can authenticate users with REFRESH_TOKEN_AUTH auth flow", async () => {
      const client = Cognito();

      const pool = await client
        .createUserPool({
          PoolName: "test",
        })
        .promise();
      const userPoolId = pool.UserPool?.Id!;

      const upc = await client
        .createUserPoolClient({
          UserPoolId: userPoolId,
          ClientName: "test",
        })
        .promise();

      const createUserResponse = await client
        .adminCreateUser({
          DesiredDeliveryMediums: ["EMAIL"],
          TemporaryPassword: "def",
          UserAttributes: [
            { Name: "email", Value: "example@example.com" },
            { Name: "email_verified", Value: "true" },
          ],
          Username: "abc",
          UserPoolId: userPoolId,
        })
        .promise();
      const userSub = attributeValue(
        "sub",
        createUserResponse.User?.Attributes,
      );

      const initialLoginResponse = await client
        .adminInitiateAuth({
          UserPoolId: userPoolId,
          ClientId: upc.UserPoolClient?.ClientId!,
          AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: "abc",
            PASSWORD: "def",
          },
        })
        .promise();

      const refreshTokenLoginResponse = await client
        .adminInitiateAuth({
          UserPoolId: userPoolId,
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
          refreshTokenLoginResponse.AuthenticationResult?.AccessToken as string,
        ),
      ).toEqual({
        auth_time: expect.any(Number),
        client_id: upc.UserPoolClient?.ClientId,
        event_id: expect.stringMatching(UUID),
        exp: expect.any(Number),
        iat: expect.any(Number),
        iss: `http://localhost:9229/${userPoolId}`,
        jti: expect.stringMatching(UUID),
        scope: "aws.cognito.signin.user.admin",
        sub: userSub,
        token_use: "access",
        username: "abc",
      });

      expect(
        jwt.decode(
          refreshTokenLoginResponse.AuthenticationResult?.IdToken as string,
        ),
      ).toEqual({
        "cognito:username": "abc",
        aud: upc.UserPoolClient?.ClientId,
        auth_time: expect.any(Number),
        email: "example@example.com",
        email_verified: true,
        event_id: expect.stringMatching(UUID),
        exp: expect.any(Number),
        iat: expect.any(Number),
        iss: `http://localhost:9229/${userPoolId}`,
        jti: expect.stringMatching(UUID),
        sub: userSub,
        token_use: "id",
      });

      expect(
        refreshTokenLoginResponse.AuthenticationResult?.RefreshToken,
      ).not.toBeDefined();
    });
  }),
);
