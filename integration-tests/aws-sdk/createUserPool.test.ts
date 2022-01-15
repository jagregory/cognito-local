import Pino from "pino";
import { ClockFake } from "../../src/__tests__/clockFake";
import { UUID } from "../../src/__tests__/patterns";
import { USER_POOL_AWS_DEFAULTS } from "../../src/services/cognitoService";
import { withCognitoSdk } from "./setup";

const currentDate = new Date();
const roundedDate = new Date(currentDate.getTime());
roundedDate.setMilliseconds(0);

const clock = new ClockFake(currentDate);

describe(
  "CognitoIdentityServiceProvider.createUserPool",
  withCognitoSdk(
    (Cognito) => {
      it("creates a user pool with only the required parameters", async () => {
        const client = Cognito();

        const result = await client
          .createUserPool({
            PoolName: "test",
          })
          .promise();

        expect(result).toEqual({
          UserPool: {
            ...USER_POOL_AWS_DEFAULTS,
            Arn: expect.stringMatching(
              /^arn:aws:cognito-idp:local:local:userpool\/local_[\w\d]{8}$/
            ),
            CreationDate: roundedDate,
            Id: expect.stringMatching(/^local_[\w\d]{8}$/),
            LastModifiedDate: roundedDate,
            Name: "test",
          },
        });
      });
    },
    {
      clock,
      logger: Pino(),
    }
  )
);
