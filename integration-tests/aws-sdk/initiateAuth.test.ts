import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.initiateAuth",
  withCognitoSdk((Cognito) => {
    it("throws for missing user", async () => {
      await expect(
        Cognito()
          .initiateAuth({
            ClientId: "test",
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: {
              USERNAME: "example@example.com",
              PASSWORD: "",
            },
          })
          .promise()
      ).rejects.toMatchObject({
        message: "Resource not found",
      });
    });
  })
);
