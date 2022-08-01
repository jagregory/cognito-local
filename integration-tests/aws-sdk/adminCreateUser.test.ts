import { ClockFake } from "../../src/__tests__/clockFake";
import { UUID } from "../../src/__tests__/patterns";
import { withCognitoSdk } from "./setup";

const currentDate = new Date();
const roundedDate = new Date(currentDate.getTime());
roundedDate.setMilliseconds(0);

const clock = new ClockFake(currentDate);

describe(
  "CognitoIdentityServiceProvider.adminCreateUser",
  withCognitoSdk(
    (Cognito, { messageDelivery }) => {
      it("creates a user with only the required parameters", async () => {
        const client = Cognito();

        const createUserResult = await client
          .adminCreateUser({
            UserAttributes: [{ Name: "phone_number", Value: "0400000000" }],
            Username: "example@example.com",
            UserPoolId: "test",
          })
          .promise();

        expect(createUserResult).toEqual({
          User: {
            Attributes: [
              {
                Name: "sub",
                Value: expect.stringMatching(UUID),
              },
              { Name: "phone_number", Value: "0400000000" },
              { Name: "email", Value: "example@example.com" },
            ],
            Enabled: true,
            UserCreateDate: roundedDate,
            UserLastModifiedDate: roundedDate,
            UserStatus: "FORCE_CHANGE_PASSWORD",
            Username: "example@example.com",
          },
        });
      });

      it("sends a welcome email", async () => {
        const fakeMessageDelivery = messageDelivery();
        const client = Cognito();
        const createUserResult = await client
          .adminCreateUser({
            DesiredDeliveryMediums: ["EMAIL"],
            UserAttributes: [{ Name: "email", Value: "example@example.com" }],
            Username: "example@example.com",
            UserPoolId: "test",
          })
          .promise();

        expect(createUserResult).toEqual({
          User: {
            Attributes: [
              {
                Name: "sub",
                Value: expect.stringMatching(UUID),
              },
              { Name: "email", Value: "example@example.com" },
            ],
            Enabled: true,
            UserCreateDate: roundedDate,
            UserLastModifiedDate: roundedDate,
            UserStatus: "FORCE_CHANGE_PASSWORD",
            Username: "example@example.com",
          },
        });

        expect(fakeMessageDelivery.collectedMessages).toEqual([
          {
            deliveryDetails: {
              AttributeName: "email",
              DeliveryMedium: "EMAIL",
              Destination: "example@example.com",
            },
            message: {
              __code: expect.stringMatching(/^.{6}$/),
            },
          },
        ]);
      });

      it("creates a user without sending a welcome email if MessageAction=SUPPRESS is passed", async () => {
        const fakeMessageDelivery = messageDelivery();
        const client = Cognito();
        const createUserResult = await client
          .adminCreateUser({
            MessageAction: "SUPPRESS",
            Username: "example@example.com",
            UserPoolId: "test",
          })
          .promise();

        expect(createUserResult).toEqual({
          User: {
            Attributes: [
              {
                Name: "sub",
                Value: expect.stringMatching(UUID),
              },
              { Name: "email", Value: "example@example.com" },
            ],
            Enabled: true,
            UserCreateDate: roundedDate,
            UserLastModifiedDate: roundedDate,
            UserStatus: "FORCE_CHANGE_PASSWORD",
            Username: "example@example.com",
          },
        });

        expect(fakeMessageDelivery.collectedMessages).toEqual([]);
      });
    },
    {
      clock,
    }
  )
);
