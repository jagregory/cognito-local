import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.createUserPoolClient",
  withCognitoSdk((Cognito) => {
    it("can create a new app client", async () => {
      const result = await Cognito()
        .createUserPoolClient({
          ClientName: "test",
          UserPoolId: "test",
        })
        .promise();

      expect(result).toEqual({
        UserPoolClient: {
          AllowedOAuthFlowsUserPoolClient: false,
          ClientId: expect.stringMatching(/^[a-z0-9]{25}$/),
          ClientName: "test",
          CreationDate: expect.any(Date),
          LastModifiedDate: expect.any(Date),
          RefreshTokenValidity: 30,
          UserPoolId: "test",
        },
      });
    });
  })
);
