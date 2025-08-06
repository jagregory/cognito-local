import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockMessages } from "../__tests__/mockMessages";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { InvalidParameterError, NotAuthorizedError } from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import type { Messages, UserPoolService } from "../services";
import {
  attribute,
  attributesAppend,
  attributeValue,
} from "../services/userPoolService";
import {
  UpdateUserAttributes,
  type UpdateUserAttributesTarget,
} from "./updateUserAttributes";

const clock = new ClockFake(new Date());

const validToken = jwt.sign(
  {
    sub: "0000-0000",
    event_id: "0",
    token_use: "access",
    scope: "aws.cognito.signin.user.admin",
    auth_time: new Date(),
    jti: uuid.v4(),
    client_id: "test",
    username: "0000-0000",
  },
  PrivateKey.pem,
  {
    algorithm: "RS256",
    issuer: `http://localhost:9229/test`,
    expiresIn: "24h",
    keyid: "CognitoLocal",
  },
);

describe("UpdateUserAttributes target", () => {
  let updateUserAttributes: UpdateUserAttributesTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;
  let mockMessages: MockedObject<Messages>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    mockMessages = newMockMessages();
    updateUserAttributes = UpdateUserAttributes({
      clock,
      cognito: newMockCognitoService(mockUserPoolService),
      messages: mockMessages,
      otp: () => "123456",
    });
  });

  it("throws if the token is invalid", async () => {
    await expect(
      updateUserAttributes(TestContext, {
        AccessToken: "invalid token",
        ClientMetadata: {
          client: "metadata",
        },
        UserAttributes: [{ Name: "custom:example", Value: "1" }],
      }),
    ).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("throws if the user doesn't exist", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      updateUserAttributes(TestContext, {
        AccessToken: validToken,
        ClientMetadata: {
          client: "metadata",
        },
        UserAttributes: [{ Name: "custom:example", Value: "1" }],
      }),
    ).rejects.toEqual(new NotAuthorizedError());
  });

  it("saves the updated attributes on the user", async () => {
    const user = TDB.user();

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);
    mockUserPoolService.options.SchemaAttributes = [
      {
        Name: "custom:example",
        Mutable: true,
      },
    ];

    await updateUserAttributes(TestContext, {
      AccessToken: validToken,
      ClientMetadata: {
        client: "metadata",
      },
      UserAttributes: [attribute("custom:example", "1")],
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...user,
      Attributes: attributesAppend(
        user.Attributes,
        attribute("custom:example", "1"),
      ),
      UserLastModifiedDate: clock.get(),
    });
  });

  describe.each(["email", "phone_number"] as const)(
    "when %s is not in AttributesRequireVerificationBeforeUpdate",
    (attr) => {
      it("saves the updated attribute value immediately", async () => {
        const user = TDB.user();

        mockUserPoolService.options.UserAttributeUpdateSettings = {
          AttributesRequireVerificationBeforeUpdate: [],
        };
        mockUserPoolService.getUserByUsername.mockResolvedValue(user);

        await updateUserAttributes(TestContext, {
          AccessToken: validToken,
          ClientMetadata: {
            client: "metadata",
          },
          UserAttributes: [attribute(attr, "new value")],
        });

        const updatedUser = {
          ...user,
          // value is in Attributes immediately
          Attributes: attributesAppend(
            user.Attributes,
            attribute(attr, "new value"),
            attribute(`${attr}_verified`, "false"),
          ),
          UserLastModifiedDate: clock.get(),
        };

        expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
          TestContext,
          updatedUser,
        );
      });
    },
  );

  describe.each(["email", "phone_number"] as const)(
    "when %s is in AttributesRequireVerificationBeforeUpdate",
    (attr) => {
      it("saves the updated attribute value pending verification", async () => {
        const user = TDB.user();

        mockUserPoolService.options.UserAttributeUpdateSettings = {
          AttributesRequireVerificationBeforeUpdate: [attr],
        };
        mockUserPoolService.getUserByUsername.mockResolvedValue(user);

        await updateUserAttributes(TestContext, {
          AccessToken: validToken,
          ClientMetadata: {
            client: "metadata",
          },
          UserAttributes: [attribute(attr, "new value")],
        });

        const updatedUser = {
          ...user,
          // value is in UnverifiedAttributeChanges pending verification
          UnverifiedAttributeChanges: [
            attribute(attr, "new value"),
            attribute(`${attr}_verified`, "false"),
          ],
          UserLastModifiedDate: clock.get(),
        };

        expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
          TestContext,
          updatedUser,
        );
      });
    },
  );

  describe.each`
    desc                                                         | attribute                  | expectedError
    ${"an attribute not in the schema"}                          | ${"custom:missing"}        | ${"user.custom:missing: Attribute does not exist in the schema."}
    ${"an attribute which isn't mutable in the schema"}          | ${"custom:immutable"}      | ${"user.custom:immutable: Attribute cannot be updated. (changing an immutable attribute)"}
    ${"email_verified without an email attribute"}               | ${"email_verified"}        | ${"Email is required to verify/un-verify an email"}
    ${"phone_number_verified without an phone_number attribute"} | ${"phone_number_verified"} | ${"Phone Number is required to verify/un-verify a phone number"}
  `("req.UserAttributes contains $desc", ({ attribute, expectedError }) => {
    beforeEach(() => {
      mockUserPoolService.options.SchemaAttributes = [
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
        updateUserAttributes(TestContext, {
          AccessToken: validToken,
          ClientMetadata: {
            client: "metadata",
          },
          UserAttributes: [{ Name: attribute, Value: "1" }],
        }),
      ).rejects.toEqual(new InvalidParameterError(expectedError));
    });
  });

  describe.each(["email", "phone_number"])(
    "%s is in req.UserAttributes without the relevant verified attribute",
    (attr) => {
      it(`sets the ${attr}_verified attribute to false`, async () => {
        const user = TDB.user();

        mockUserPoolService.getUserByUsername.mockResolvedValue(user);

        await updateUserAttributes(TestContext, {
          AccessToken: validToken,
          ClientMetadata: {
            client: "metadata",
          },
          UserAttributes: [attribute(attr, "new value")],
        });

        expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
          ...user,
          Attributes: attributesAppend(
            user.Attributes,
            attribute(attr, "new value"),
            attribute(`${attr}_verified`, "false"),
          ),
          UserLastModifiedDate: clock.get(),
        });
      });
    },
  );

  describe("user pool has auto verified attributes enabled", () => {
    beforeEach(() => {
      mockUserPoolService.options.AutoVerifiedAttributes = ["email"];
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
              attribute(`${attr}_verified`, "false"),
            ),
          });

          mockUserPoolService.getUserByUsername.mockResolvedValue(user);
          mockUserPoolService.options.SchemaAttributes = [
            { Name: "example", Mutable: true },
          ];

          await updateUserAttributes(TestContext, {
            AccessToken: validToken,
            ClientMetadata: {
              client: "metadata",
            },
            UserAttributes: [attribute("example", "1")],
          });

          expect(mockMessages.deliver).not.toHaveBeenCalled();
        });
      });

      describe("the verification status changed because of the update", () => {
        it("delivers a OTP code to the user's updated attribute value", async () => {
          const user = TDB.user();

          mockUserPoolService.getUserByUsername.mockResolvedValue(user);

          await updateUserAttributes(TestContext, {
            AccessToken: validToken,
            ClientMetadata: {
              client: "metadata",
            },
            UserAttributes: attributes.map((attr: string) =>
              attribute(attr, "new value"),
            ),
          });

          const updatedUser = {
            ...user,
            Attributes: attributesAppend(
              user.Attributes,
              ...attributes.flatMap((attr: string) => [
                attribute(attr, "new value"),
                attribute(`${attr}_verified`, "false"),
              ]),
            ),
            UserLastModifiedDate: clock.get(),
          };

          expect(mockMessages.deliver).toHaveBeenCalledWith(
            TestContext,
            "UpdateUserAttribute",
            null,
            "test",
            updatedUser,
            "123456",
            { client: "metadata" },
            {
              AttributeName: "email",
              DeliveryMedium: "EMAIL",
              Destination: attributeValue("email", updatedUser.Attributes),
            },
          );

          expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
            TestContext,
            expect.objectContaining({
              AttributeVerificationCode: "123456",
            }),
          );
        });
      });
    });
  });

  describe("user pool does not have auto verified attributes", () => {
    beforeEach(() => {
      mockUserPoolService.options.AutoVerifiedAttributes = [];
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
              attribute(`${attr}_verified`, "false"),
            ),
          });

          mockUserPoolService.getUserByUsername.mockResolvedValue(user);
          mockUserPoolService.options.SchemaAttributes = [
            { Name: "example", Mutable: true },
          ];

          await updateUserAttributes(TestContext, {
            AccessToken: validToken,
            ClientMetadata: {
              client: "metadata",
            },
            UserAttributes: [attribute("example", "1")],
          });

          expect(mockMessages.deliver).not.toHaveBeenCalled();
        });
      });

      describe("the verification status changed because of the update", () => {
        it("does not deliver a OTP code to the user", async () => {
          const user = TDB.user();

          mockUserPoolService.getUserByUsername.mockResolvedValue(user);

          await updateUserAttributes(TestContext, {
            AccessToken: validToken,
            ClientMetadata: {
              client: "metadata",
            },
            UserAttributes: attributes.map((attr: string) =>
              attribute(attr, "new value"),
            ),
          });

          expect(mockMessages.deliver).not.toHaveBeenCalled();
        });
      });
    });
  });
});
