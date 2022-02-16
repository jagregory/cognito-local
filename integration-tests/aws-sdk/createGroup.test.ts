import { ClockFake } from "../../src/__tests__/clockFake";
import { withCognitoSdk } from "./setup";

const currentDate = new Date();
const roundedDate = new Date(currentDate.getTime());
roundedDate.setMilliseconds(0);

const clock = new ClockFake(currentDate);

describe(
  "CognitoIdentityServiceProvider.createGroup",
  withCognitoSdk(
    (Cognito) => {
      it("creates a group with only the required parameters", async () => {
        const client = Cognito();

        const createGroupResult = await client
          .createGroup({
            GroupName: "abc",
            UserPoolId: "test",
          })
          .promise();

        expect(createGroupResult).toEqual({
          Group: {
            CreationDate: roundedDate,
            GroupName: "abc",
            LastModifiedDate: roundedDate,
            UserPoolId: "test",
          },
        });
      });

      it("creates a group with all parameters", async () => {
        const client = Cognito();

        const createGroupResult = await client
          .createGroup({
            Description: "Description",
            GroupName: "abc",
            Precedence: 1,
            RoleArn: "arn",
            UserPoolId: "test",
          })
          .promise();

        expect(createGroupResult).toEqual({
          Group: {
            CreationDate: roundedDate,
            Description: "Description",
            GroupName: "abc",
            LastModifiedDate: roundedDate,
            Precedence: 1,
            RoleArn: "arn",
            UserPoolId: "test",
          },
        });
      });
    },
    {
      clock,
    }
  )
);
