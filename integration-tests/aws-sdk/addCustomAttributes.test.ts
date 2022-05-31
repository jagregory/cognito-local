import { USER_POOL_AWS_DEFAULTS } from "../../src/services/cognitoService";
import { withCognitoSdk } from "./setup";

describe(
  "CognitoIdentityServiceProvider.addCustomAttributes",
  withCognitoSdk((Cognito) => {
    it("updates a user pool", async () => {
      const client = Cognito();

      // create the user pool client
      const up = await client
        .createUserPool({
          PoolName: "pool",
        })
        .promise();

      const describeResponse = await client
        .describeUserPool({
          UserPoolId: up.UserPool?.Id!,
        })
        .promise();

      expect(describeResponse.UserPool).toMatchObject({
        SchemaAttributes: USER_POOL_AWS_DEFAULTS.SchemaAttributes,
      });

      await client
        .addCustomAttributes({
          UserPoolId: up.UserPool?.Id!,
          CustomAttributes: [
            {
              AttributeDataType: "String",
              Name: "test",
            },
          ],
        })
        .promise();

      const describeResponseAfterUpdate = await client
        .describeUserPool({
          UserPoolId: up.UserPool?.Id!,
        })
        .promise();

      expect(describeResponseAfterUpdate.UserPool).toMatchObject({
        SchemaAttributes: [
          ...(USER_POOL_AWS_DEFAULTS.SchemaAttributes ?? []),
          {
            AttributeDataType: "String",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Name: "custom:test",
            Required: false,
            StringAttributeConstraints: {},
          },
        ],
      });
    });
  })
);
