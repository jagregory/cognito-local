import { UUID } from "../../src/__tests__/patterns";
import { attributeValue } from "../../src/services/userPoolService";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.respondToAuthChallenge",
  withCognitoSdk((Cognito) => {
    it("handles NEW_PASSWORD_REQUIRED challenge", async () => {
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

      const initiateAuthResponse = await client
        .initiateAuth({
          ClientId: upc.UserPoolClient?.ClientId!,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: "abc",
            PASSWORD: "def",
          },
        })
        .promise();

      const response = await client
        .respondToAuthChallenge({
          ChallengeName: "NEW_PASSWORD_REQUIRED",
          ClientId: upc.UserPoolClient?.ClientId!,
          Session: initiateAuthResponse.Session,
          ChallengeResponses: {
            USERNAME: "abc",
            NEW_PASSWORD: "new_password",
          },
        })
        .promise();

      expect(response).toEqual({
        AuthenticationResult: {
          AccessToken: expect.any(String),
          IdToken: expect.any(String),
          RefreshToken: expect.any(String),
        },
        ChallengeParameters: {},
      });
    });
  })
);
