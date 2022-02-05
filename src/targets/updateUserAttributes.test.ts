import jwt from "jsonwebtoken";
import * as uuid from "uuid";
import { MockClock } from "../mocks/MockClock";
import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockMessages } from "../mocks/MockMessages";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";
import { InvalidParameterError, NotAuthorizedError } from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import { Messages, UserPoolService } from "../services";
import {
  attribute,
  attributesAppend,
  attributeValue,
} from "../services/userPoolService";
import {
  UpdateUserAttributes,
  UpdateUserAttributesTarget,
} from "./updateUserAttributes";
import { MockUser } from "../mocks/MockUser";

const clock = new MockClock(new Date());

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
  }
);

describe("UpdateUserAttributes target", () => {
  let updateUserAttributes: UpdateUserAttributesTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let mockMessages: jest.Mocked<Messages>;

  beforeEach(() => {
    mockUserPoolService = MockUserPoolService();
    mockMessages = MockMessages();
    updateUserAttributes = UpdateUserAttributes({
      clock,
      cognito: MockCognitoService(mockUserPoolService),
      messages: mockMessages,
      otp: () => "1234",
    });
  });

  it("throws if the token is invalid", async () => {
    await expect(
      updateUserAttributes(MockContext, {
        AccessToken: "invalid token",
        ClientMetadata: {
          client: "metadata",
        },
        UserAttributes: [{ Name: "custom:example", Value: "1" }],
      })
    ).rejects.toBeInstanceOf(InvalidParameterError);
  });

  it("throws if the user doesn't exist", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      updateUserAttributes(MockContext, {
        AccessToken: validToken,
        ClientMetadata: {
          client: "metadata",
        },
        UserAttributes: [{ Name: "custom:example", Value: "1" }],
      })
    ).rejects.toEqual(new NotAuthorizedError());
  });

  it("saves the updated attributes on the user", async () => {
    const user = MockUser();

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);
    mockUserPoolService.config.SchemaAttributes = [
      {
        Name: "custom:example",
        Mutable: true,
      },
    ];

    await updateUserAttributes(MockContext, {
      AccessToken: validToken,
      ClientMetadata: {
        client: "metadata",
      },
      UserAttributes: [attribute("custom:example", "1")],
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(MockContext, {
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
      mockUserPoolService.getUserByUsername.mockResolvedValue(MockUser());

      await expect(
        updateUserAttributes(MockContext, {
          AccessToken: validToken,
          ClientMetadata: {
            client: "metadata",
          },
          UserAttributes: [{ Name: attribute, Value: "1" }],
        })
      ).rejects.toEqual(new InvalidParameterError(expectedError));
    });
  });

  describe.each(["email", "phone_number"])(
    "%s is in req.UserAttributes without the relevant verified attribute",
    (attr) => {
      it(`sets the ${attr}_verified attribute to false`, async () => {
        const user = MockUser();

        mockUserPoolService.getUserByUsername.mockResolvedValue(user);

        await updateUserAttributes(MockContext, {
          AccessToken: validToken,
          ClientMetadata: {
            client: "metadata",
          },
          UserAttributes: [attribute(attr, "new value")],
        });

        expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(MockContext, {
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
          const user = MockUser({
            Attributes: attributes.map((attr: string) =>
              attribute(`${attr}_verified`, "false")
            ),
          });

          mockUserPoolService.getUserByUsername.mockResolvedValue(user);
          mockUserPoolService.config.SchemaAttributes = [
            { Name: "example", Mutable: true },
          ];

          await updateUserAttributes(MockContext, {
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
        it("throws if the user doesn't have a valid way to contact them", async () => {
          const user = MockUser({
            Attributes: [],
          });

          mockUserPoolService.getUserByUsername.mockResolvedValue(user);

          await expect(
            updateUserAttributes(MockContext, {
              AccessToken: validToken,
              ClientMetadata: {
                client: "metadata",
              },
              UserAttributes: attributes.map((attr: string) =>
                attribute(attr, "new value")
              ),
            })
          ).rejects.toEqual(
            new InvalidParameterError(
              "User has no attribute matching desired auto verified attributes"
            )
          );
        });

        it("delivers a OTP code to the user", async () => {
          const user = MockUser();

          mockUserPoolService.getUserByUsername.mockResolvedValue(user);

          await updateUserAttributes(MockContext, {
            AccessToken: validToken,
            ClientMetadata: {
              client: "metadata",
            },
            UserAttributes: attributes.map((attr: string) =>
              attribute(attr, "new value")
            ),
          });

          expect(mockMessages.deliver).toHaveBeenCalledWith(
            MockContext,
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

          expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
            MockContext,
            expect.objectContaining({
              AttributeVerificationCode: "1234",
            })
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
          const user = MockUser({
            Attributes: attributes.map((attr: string) =>
              attribute(`${attr}_verified`, "false")
            ),
          });

          mockUserPoolService.getUserByUsername.mockResolvedValue(user);
          mockUserPoolService.config.SchemaAttributes = [
            { Name: "example", Mutable: true },
          ];

          await updateUserAttributes(MockContext, {
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
          const user = MockUser();

          mockUserPoolService.getUserByUsername.mockResolvedValue(user);

          await updateUserAttributes(MockContext, {
            AccessToken: validToken,
            ClientMetadata: {
              client: "metadata",
            },
            UserAttributes: attributes.map((attr: string) =>
              attribute(attr, "new value")
            ),
          });

          expect(mockMessages.deliver).not.toHaveBeenCalled();
        });
      });
    });
  });
});
