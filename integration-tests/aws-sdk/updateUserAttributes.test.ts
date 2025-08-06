import { describe, expect, it } from "vitest";
import { UUID } from "../../src/__tests__/patterns";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.updateUserAttributes",
  withCognitoSdk((Cognito, { messageDelivery }) => {
    it("updates a user's attributes", async () => {
      const client = Cognito();

      const pool = await client
        .createUserPool({
          PoolName: "test",
          AutoVerifiedAttributes: ["email"],
        })
        .promise();
      const userPoolId = pool.UserPool?.Id as string;

      const upc = await client
        .createUserPoolClient({
          UserPoolId: userPoolId,
          ClientName: "test",
        })
        .promise();

      await client
        .adminCreateUser({
          UserAttributes: [
            { Name: "email", Value: "example@example.com" },
            { Name: "phone_number", Value: "0400000000" },
          ],
          Username: "abc",
          UserPoolId: userPoolId,
          TemporaryPassword: "def",
        })
        .promise();

      await client
        .adminSetUserPassword({
          UserPoolId: userPoolId,
          Username: "abc",
          Password: "def",
          Permanent: true,
        })
        .promise();

      // login as the user
      const initiateAuthResponse = await client
        .initiateAuth({
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: "abc",
            PASSWORD: "def",
          },
          ClientId: upc.UserPoolClient?.ClientId as string,
        })
        .promise();

      let user = await client
        .adminGetUser({
          UserPoolId: userPoolId,
          Username: "abc",
        })
        .promise();

      expect(user.UserAttributes).toEqual([
        { Name: "email", Value: "example@example.com" },
        { Name: "phone_number", Value: "0400000000" },
        { Name: "sub", Value: expect.stringMatching(UUID) },
      ]);

      await client
        .updateUserAttributes({
          AccessToken: initiateAuthResponse.AuthenticationResult
            ?.AccessToken as string,
          UserAttributes: [{ Name: "email", Value: "example2@example.com" }],
        })
        .promise();

      user = await client
        .adminGetUser({
          UserPoolId: userPoolId,
          Username: "abc",
        })
        .promise();

      expect(user.UserAttributes).toEqual([
        { Name: "email", Value: "example2@example.com" },
        { Name: "email_verified", Value: "false" },
        { Name: "phone_number", Value: "0400000000" },
        { Name: "sub", Value: expect.stringMatching(UUID) },
      ]);
    });

    it("delays updating a user's attributes when they're in AttributesRequireVerificationBeforeUpdate until verification is complete", async () => {
      const originalEmail = "example@example.com";
      const newEmail = "new@example.com";
      const password = "abcdef";

      const client = Cognito();

      const pool = await client
        .createUserPool({
          PoolName: "test",
          AutoVerifiedAttributes: ["email"],
          UsernameAttributes: ["email"],
          UserAttributeUpdateSettings: {
            AttributesRequireVerificationBeforeUpdate: ["email"],
          },
        })
        .promise();
      const userPoolId = pool.UserPool?.Id as string;

      const upc = await client
        .createUserPoolClient({
          UserPoolId: userPoolId,
          ClientName: "test",
        })
        .promise();

      await client
        .adminCreateUser({
          UserAttributes: [
            { Name: "email", Value: originalEmail },
            { Name: "email_verified", Value: "true" },
          ],
          Username: originalEmail,
          UserPoolId: userPoolId,
          TemporaryPassword: password,
          DesiredDeliveryMediums: ["EMAIL"],
        })
        .promise();

      await client
        .adminSetUserPassword({
          UserPoolId: userPoolId,
          Username: originalEmail,
          Password: password,
          Permanent: true,
        })
        .promise();

      // login as the user
      let initiateAuthResponse = await client
        .initiateAuth({
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: originalEmail,
            PASSWORD: password,
          },
          ClientId: upc.UserPoolClient?.ClientId as string,
        })
        .promise();

      let user = await client
        .adminGetUser({
          UserPoolId: userPoolId,
          Username: originalEmail,
        })
        .promise();

      expect(user.UserAttributes).toEqual([
        { Name: "email", Value: originalEmail },
        { Name: "email_verified", Value: "true" },
        { Name: "sub", Value: expect.stringMatching(UUID) },
      ]);

      // start updating the email address, but it shouldn't be saved yet
      await client
        .updateUserAttributes({
          AccessToken: initiateAuthResponse.AuthenticationResult
            ?.AccessToken as string,
          UserAttributes: [{ Name: "email", Value: newEmail }],
        })
        .promise();

      user = await client
        .adminGetUser({
          UserPoolId: userPoolId,
          Username: originalEmail,
        })
        .promise();

      // email is unchanged
      expect(user.UserAttributes).toEqual([
        { Name: "email", Value: originalEmail },
        { Name: "email_verified", Value: "true" },
        { Name: "sub", Value: expect.stringMatching(UUID) },
      ]);

      // confirm the user can still login with their original email and not yet with the new email
      initiateAuthResponse = await client
        .initiateAuth({
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: originalEmail,
            PASSWORD: password,
          },
          ClientId: upc.UserPoolClient?.ClientId as string,
        })
        .promise();
      await expect(
        client
          .initiateAuth({
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: {
              USERNAME: newEmail,
              PASSWORD: password,
            },
            ClientId: upc.UserPoolClient?.ClientId as string,
          })
          .promise(),
      ).rejects.toThrow("User not authorized");

      // now verify the attribute with the confirmation code
      const lastMessage = messageDelivery().collectedMessages.at(-1);
      const code = lastMessage?.message?.__code;
      expect(code).toBeDefined();

      await client
        .verifyUserAttribute({
          AccessToken: initiateAuthResponse.AuthenticationResult
            ?.AccessToken as string,
          AttributeName: "email",
          Code: code!,
        })
        .promise();

      // get the user by their new email
      user = await client
        .adminGetUser({
          UserPoolId: userPoolId,
          Username: newEmail,
        })
        .promise();

      // email is updated and verified
      expect(user.UserAttributes).toEqual([
        { Name: "email", Value: newEmail },
        { Name: "email_verified", Value: "true" },
        { Name: "sub", Value: expect.stringMatching(UUID) },
      ]);

      // can login with the new email
      await client
        .initiateAuth({
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: newEmail,
            PASSWORD: password,
          },
          ClientId: upc.UserPoolClient?.ClientId as string,
        })
        .promise();

      // old email doesn't exist anymore
      await expect(
        client
          .adminGetUser({
            UserPoolId: userPoolId,
            Username: originalEmail,
          })
          .promise(),
      ).rejects.toThrow("User does not exist.");

      // cannot login with the old email either
      await expect(
        client
          .initiateAuth({
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: {
              USERNAME: originalEmail,
              PASSWORD: password,
            },
            ClientId: upc.UserPoolClient?.ClientId as string,
          })
          .promise(),
      ).rejects.toThrow("User not authorized");
    });
  }),
);
