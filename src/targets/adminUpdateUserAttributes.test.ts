import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockMessages } from "../__tests__/mockMessages";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import { InvalidParameterError, NotAuthorizedError } from "../errors";
import { Messages, UserPoolService } from "../services";
import {
  attribute,
  attributesAppend,
  attributeValue,
} from "../services/userPoolService";
import {
  AdminUpdateUserAttributes,
  AdminUpdateUserAttributesTarget,
} from "./adminUpdateUserAttributes";
import * as TDB from "../__tests__/testDataBuilder";

describe("AdminUpdateUserAttributes target", () => {
  let adminUpdateUserAttributes: AdminUpdateUserAttributesTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let clock: ClockFake;
  let mockMessages: jest.Mocked<Messages>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    clock = new ClockFake(new Date());
    mockMessages = newMockMessages();
    adminUpdateUserAttributes = AdminUpdateUserAttributes({
      clock,
      cognito: newMockCognitoService(mockUserPoolService),
      messages: mockMessages,
      otp: () => "1234",
    });
  });

  it("throws if the user doesn't exist", async () => {
    await expect(
      adminUpdateUserAttributes(TestContext, {
        ClientMetadata: {
          client: "metadata",
        },
        UserPoolId: "test",
        UserAttributes: [{ Name: "custom:example", Value: "1" }],
        Username: "abc",
      })
    ).rejects.toEqual(new NotAuthorizedError());
  });

  it("saves the updated attributes on the user", async () => {
    const user = TDB.user();

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);
    mockUserPoolService.config.SchemaAttributes = [
      {
        Name: "custom:example",
        Mutable: true,
      },
    ];

    await adminUpdateUserAttributes(TestContext, {
      ClientMetadata: {
        client: "metadata",
      },
      UserPoolId: "test",
      UserAttributes: [attribute("custom:example", "1")],
      Username: "abc",
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...user,
      Attributes: attributesAppend(
        user.Attributes,
        attribute("custom:example", "1")
      ),
      UserLastModifiedDate: clock.get(),
    });
  });

  describe.each`
    desc                                                         | attribute                  | expectedError
    ${"an attribute not in the schema"}                          | ${"custom:missing"}        | ${"user.custom:missing: Attribute does not exist in the schema."}
    ${"an attribute which isn't mutable in the schema"}          | ${"custom:immutable"}      | ${"user.custom:immutable: Attribute cannot be updated. (changing an immutable attribute)"}
    ${"email_verified without an email attribute"}               | ${"email_verified"}        | ${"Email is required to verify/un-verify an email"}
    ${"phone_number_verified without an phone_number attribute"} | ${"phone_number_verified"} | ${"Phone Number is required to verify/un-verify a phone number"}
  `("req.UserAttributes contains $desc", ({ attribute, expectedError }) => {
    beforeEach(() => {
      mockUserPoolService.config.SchemaAttributes = [
        {
          Name: "email_verified",
          Mutable: true,
        },
        {
          Name: "phone_number_verified",
          Mutable: true,
        },
        {
          Name: "custom:immutable",
          Mutable: false,
        },
      ];
    });

    it("throws an invalid parameter error", async () => {
      mockUserPoolService.getUserByUsername.mockResolvedValue(TDB.user());

      await expect(
        adminUpdateUserAttributes(TestContext, {
          ClientMetadata: {
            client: "metadata",
          },
          UserPoolId: "test",
          UserAttributes: [{ Name: attribute, Value: "1" }],
          Username: "abc",
        })
      ).rejects.toEqual(new InvalidParameterError(expectedError));
    });
  });

  describe.each(["email", "phone_number"])(
    "%s is in req.UserAttributes without the relevant verified attribute",
    (attr) => {
      it(`sets the ${attr}_verified attribute to false`, async () => {
        const user = TDB.user();

        mockUserPoolService.getUserByUsername.mockResolvedValue(user);

        await adminUpdateUserAttributes(TestContext, {
          ClientMetadata: {
            client: "metadata",
          },
          UserPoolId: "test",
          UserAttributes: [attribute(attr, "new value")],
          Username: "abc",
        });

        expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
          ...user,
          Attributes: attributesAppend(
            user.Attributes,
            attribute(attr, "new value"),
            attribute(`${attr}_verified`, "false")
          ),
          UserLastModifiedDate: clock.get(),
        });
      });
    }
  );

  describe("user pool has auto verified attributes enabled", () => {
    beforeEach(() => {
      mockUserPoolService.config.AutoVerifiedAttributes = ["email"];
    });

    describe.each`
      attributes
      ${["email"]}
      ${["phone_number"]}
      ${["email", "phone_number"]}
    `("when $attributes is unverified", ({ attributes }) => {
      describe("the verification status was not affected by the update", () => {
        it("does not deliver a OTP code to the user", async () => {
          const user = TDB.user({
            Attributes: attributes.map((attr: string) =>
              attribute(`${attr}_verified`, "false")
            ),
          });

          mockUserPoolService.getUserByUsername.mockResolvedValue(user);
          mockUserPoolService.config.SchemaAttributes = [
            { Name: "example", Mutable: true },
          ];

          await adminUpdateUserAttributes(TestContext, {
            ClientMetadata: {
              client: "metadata",
            },
            UserPoolId: "test",
            UserAttributes: [attribute("example", "1")],
            Username: "abc",
          });

          expect(mockMessages.deliver).not.toHaveBeenCalled();
        });
      });

      describe("the verification status changed because of the update", () => {
        it("throws if the user doesn't have a valid way to contact them", async () => {
          const user = TDB.user({
            Attributes: [],
          });

          mockUserPoolService.getUserByUsername.mockResolvedValue(user);

          await expect(
            adminUpdateUserAttributes(TestContext, {
              ClientMetadata: {
                client: "metadata",
              },
              UserPoolId: "test",
              UserAttributes: attributes.map((attr: string) =>
                attribute(attr, "new value")
              ),
              Username: "abc",
            })
          ).rejects.toEqual(
            new InvalidParameterError(
              "User has no attribute matching desired auto verified attributes"
            )
          );
        });

        it("delivers a OTP code to the user", async () => {
          const user = TDB.user();

          mockUserPoolService.getUserByUsername.mockResolvedValue(user);

          await adminUpdateUserAttributes(TestContext, {
            ClientMetadata: {
              client: "metadata",
            },
            UserPoolId: "test",
            UserAttributes: attributes.map((attr: string) =>
              attribute(attr, "new value")
            ),
            Username: "abc",
          });

          expect(mockMessages.deliver).toHaveBeenCalledWith(
            TestContext,
            "UpdateUserAttribute",
            null,
            "test",
            user,
            "1234",
            { client: "metadata" },
            {
              AttributeName: "email",
              DeliveryMedium: "EMAIL",
              Destination: attributeValue("email", user.Attributes),
            }
          );
        });
      });
    });
  });

  describe("user pool does not have auto verified attributes", () => {
    beforeEach(() => {
      mockUserPoolService.config.AutoVerifiedAttributes = [];
    });

    describe.each`
      attributes
      ${["email"]}
      ${["phone_number"]}
      ${["email", "phone_number"]}
    `("when $attributes is unverified", ({ attributes }) => {
      describe("the verification status was not affected by the update", () => {
        it("does not deliver a OTP code to the user", async () => {
          const user = TDB.user({
            Attributes: attributes.map((attr: string) =>
              attribute(`${attr}_verified`, "false")
            ),
          });

          mockUserPoolService.getUserByUsername.mockResolvedValue(user);
          mockUserPoolService.config.SchemaAttributes = [
            { Name: "example", Mutable: true },
          ];

          await adminUpdateUserAttributes(TestContext, {
            ClientMetadata: {
              client: "metadata",
            },
            UserPoolId: "test",
            UserAttributes: [attribute("example", "1")],
            Username: "abc",
          });

          expect(mockMessages.deliver).not.toHaveBeenCalled();
        });
      });

      describe("the verification status changed because of the update", () => {
        it("does not deliver a OTP code to the user", async () => {
          const user = TDB.user();

          mockUserPoolService.getUserByUsername.mockResolvedValue(user);

          await adminUpdateUserAttributes(TestContext, {
            ClientMetadata: {
              client: "metadata",
            },
            UserPoolId: "test",
            UserAttributes: attributes.map((attr: string) =>
              attribute(attr, "new value")
            ),
            Username: "abc",
          });

          expect(mockMessages.deliver).not.toHaveBeenCalled();
        });
      });
    });
  });
});
