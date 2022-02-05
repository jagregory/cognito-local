import { MockClock } from "../mocks/MockClock";
import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";

import { CognitoService } from "../services";
import { USER_POOL_AWS_DEFAULTS } from "../services/cognitoService";
import { CreateUserPool, CreateUserPoolTarget } from "./createUserPool";
import { MockUserPool } from "../mocks/MockUserPool";

const originalDate = new Date();

describe("CreateUserPool target", () => {
  let createUserPool: CreateUserPoolTarget;
  let mockCognitoService: jest.Mocked<CognitoService>;

  beforeEach(() => {
    mockCognitoService = MockCognitoService(MockUserPoolService());
    createUserPool = CreateUserPool({
      cognito: mockCognitoService,
      clock: new MockClock(originalDate),
    });
  });

  it("creates a new user pool", async () => {
    const createdUserPool = MockUserPool();
    mockCognitoService.createUserPool.mockResolvedValue(createdUserPool);

    const result = await createUserPool(MockContext, {
      PoolName: "test-pool",
    });

    expect(mockCognitoService.createUserPool).toHaveBeenCalledWith(
      MockContext,
      {
        Arn: expect.stringMatching(
          /^arn:aws:cognito-idp:local:local:userpool\/local_[\w\d]{8}$/
        ),
        CreationDate: originalDate,
        Id: expect.stringMatching(/^local_[\w\d]{8}$/),
        LastModifiedDate: originalDate,
        Name: "test-pool",
        SchemaAttributes: USER_POOL_AWS_DEFAULTS.SchemaAttributes,
      }
    );

    expect(result).toEqual({
      UserPool: createdUserPool,
    });
  });

  it("creates a new user pool with a custom attribute", async () => {
    const createdUserPool = MockUserPool();
    mockCognitoService.createUserPool.mockResolvedValue(createdUserPool);

    const result = await createUserPool(MockContext, {
      PoolName: "test-pool",
      Schema: [
        {
          Name: "my_attribute",
          AttributeDataType: "String",
        },
      ],
    });

    expect(mockCognitoService.createUserPool).toHaveBeenCalledWith(
      MockContext,
      {
        Arn: expect.stringMatching(
          /^arn:aws:cognito-idp:local:local:userpool\/local_[\w\d]{8}$/
        ),
        CreationDate: originalDate,
        Id: expect.stringMatching(/^local_[\w\d]{8}$/),
        LastModifiedDate: originalDate,
        Name: "test-pool",
        SchemaAttributes: [
          ...(USER_POOL_AWS_DEFAULTS.SchemaAttributes ?? []),
          {
            Name: "custom:my_attribute",
            AttributeDataType: "String",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: false,
            StringAttributeConstraints: {},
          },
        ],
      }
    );

    expect(result).toEqual({
      UserPool: createdUserPool,
    });
  });

  it("creates a new user pool with an overridden attribute", async () => {
    const createdUserPool = MockUserPool();
    mockCognitoService.createUserPool.mockResolvedValue(createdUserPool);

    const result = await createUserPool(MockContext, {
      PoolName: "test-pool",
      Schema: [
        {
          Name: "email",
          AttributeDataType: "String",
          Required: true,
        },
      ],
    });

    expect(mockCognitoService.createUserPool).toHaveBeenCalledWith(
      MockContext,
      {
        Arn: expect.stringMatching(
          /^arn:aws:cognito-idp:local:local:userpool\/local_[\w\d]{8}$/
        ),
        CreationDate: originalDate,
        Id: expect.stringMatching(/^local_[\w\d]{8}$/),
        LastModifiedDate: originalDate,
        Name: "test-pool",
        SchemaAttributes: [
          {
            Name: "sub",
            AttributeDataType: "String",
            DeveloperOnlyAttribute: false,
            Mutable: false,
            Required: true,
            StringAttributeConstraints: {
              MinLength: "1",
              MaxLength: "2048",
            },
          },
          {
            Name: "name",
            AttributeDataType: "String",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: false,
            StringAttributeConstraints: {
              MinLength: "0",
              MaxLength: "2048",
            },
          },
          {
            Name: "given_name",
            AttributeDataType: "String",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: false,
            StringAttributeConstraints: {
              MinLength: "0",
              MaxLength: "2048",
            },
          },
          {
            Name: "family_name",
            AttributeDataType: "String",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: false,
            StringAttributeConstraints: {
              MinLength: "0",
              MaxLength: "2048",
            },
          },
          {
            Name: "middle_name",
            AttributeDataType: "String",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: false,
            StringAttributeConstraints: {
              MinLength: "0",
              MaxLength: "2048",
            },
          },
          {
            Name: "nickname",
            AttributeDataType: "String",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: false,
            StringAttributeConstraints: {
              MinLength: "0",
              MaxLength: "2048",
            },
          },
          {
            Name: "preferred_username",
            AttributeDataType: "String",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: false,
            StringAttributeConstraints: {
              MinLength: "0",
              MaxLength: "2048",
            },
          },
          {
            Name: "profile",
            AttributeDataType: "String",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: false,
            StringAttributeConstraints: {
              MinLength: "0",
              MaxLength: "2048",
            },
          },
          {
            Name: "picture",
            AttributeDataType: "String",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: false,
            StringAttributeConstraints: {
              MinLength: "0",
              MaxLength: "2048",
            },
          },
          {
            Name: "website",
            AttributeDataType: "String",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: false,
            StringAttributeConstraints: {
              MinLength: "0",
              MaxLength: "2048",
            },
          },
          {
            Name: "email",
            AttributeDataType: "String",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: true,
            StringAttributeConstraints: {
              MinLength: "0",
              MaxLength: "2048",
            },
          },
          {
            Name: "email_verified",
            AttributeDataType: "Boolean",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: false,
          },
          {
            Name: "gender",
            AttributeDataType: "String",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: false,
            StringAttributeConstraints: {
              MinLength: "0",
              MaxLength: "2048",
            },
          },
          {
            Name: "birthdate",
            AttributeDataType: "String",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: false,
            StringAttributeConstraints: {
              MinLength: "10",
              MaxLength: "10",
            },
          },
          {
            Name: "zoneinfo",
            AttributeDataType: "String",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: false,
            StringAttributeConstraints: {
              MinLength: "0",
              MaxLength: "2048",
            },
          },
          {
            Name: "locale",
            AttributeDataType: "String",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: false,
            StringAttributeConstraints: {
              MinLength: "0",
              MaxLength: "2048",
            },
          },
          {
            Name: "phone_number",
            AttributeDataType: "String",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: false,
            StringAttributeConstraints: {
              MinLength: "0",
              MaxLength: "2048",
            },
          },
          {
            Name: "phone_number_verified",
            AttributeDataType: "Boolean",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: false,
          },
          {
            Name: "address",
            AttributeDataType: "String",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: false,
            StringAttributeConstraints: {
              MinLength: "0",
              MaxLength: "2048",
            },
          },
          {
            Name: "updated_at",
            AttributeDataType: "Number",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: false,
            NumberAttributeConstraints: {
              MinValue: "0",
            },
          },
        ],
      }
    );

    expect(result).toEqual({
      UserPool: createdUserPool,
    });
  });
});
